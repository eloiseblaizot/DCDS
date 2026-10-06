// Vérifie la migration SQL, les fonctions serveur et la sécurité (RLS) sur un Postgres
// embarqué (PGlite), avec des bouchons qui imitent Supabase. Lancer : npm run test:sql
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";

const db = new PGlite();
const ok = (cond, msg) => {
  console.log(`${cond ? "PASS" : "FAIL"}  ${msg}`);
  if (!cond) process.exitCode = 1;
};
const expectError = async (sql, params, pattern, msg) => {
  try {
    await db.query(sql, params);
    ok(false, `${msg} (aucune erreur levée)`);
  } catch (e) {
    ok(pattern.test(e.message), `${msg} → ${e.message}`);
  }
};

// --- Bouchons Supabase : rôles, schéma auth, publication realtime, privilèges par défaut.
await db.exec(`
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create publication supabase_realtime;
  grant usage on schema public, auth to anon, authenticated, service_role;
  grant execute on function auth.uid() to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
`);

const migration = readFileSync(new URL("../migrations/0001_dcds.sql", import.meta.url), "utf8").replace(
  "create extension if not exists pgcrypto;",
  "",
);
await db.exec(migration);
ok(true, "migration exécutée sans erreur");
// Idempotence : la migration doit pouvoir être relancée.
await db.exec(migration);
ok(true, "migration relancée sans erreur (idempotente)");

const U = Array.from({ length: 7 }, (_, i) => `00000000-0000-0000-0000-00000000000${i + 1}`);
for (const u of U) await db.query("insert into auth.users (id) values ($1)", [u]);

const settings = { isPublic: true, maxPlayers: 4, video: true, audio: true };
const created = await db.query("select public.create_room($1,$2,$3,$4,$5) as id", ["abc123", U[0], "Alice", null, settings]);
const roomId = created.rows[0].id;
ok(!!roomId, "create_room renvoie un id");

const join = async (u, name, spectator = false) =>
  (await db.query("select public.join_room($1,$2,$3,$4,$5) as r", ["ABC123", u, name, null, spectator])).rows[0].r;

ok((await join(U[1], "Bob")).role === "player", "Bob rejoint comme joueur");
ok((await join(U[2], "Chloé")).role === "player", "Chloé rejoint comme joueur");
ok((await join(U[3], "Dan")).role === "player", "Dan rejoint comme joueur (4/4)");
ok((await join(U[4], "Eve")).role === "spectator", "Eve devient spectatrice (salon plein)");
ok((await join(U[1], "Bobby")).role === "player", "re-join de Bob : rôle conservé");
const bobName = (await db.query("select name from room_members where user_id=$1", [U[1]])).rows[0].name;
ok(bobName === "Bobby", "re-join met à jour le pseudo");
await expectError("select public.join_room('NOPE00',$1,'x',null,false)", [U[5]], /ROOM_NOT_FOUND/, "code inconnu refusé");
await expectError("select public.set_member_role($1,$2,'player')", [roomId, U[4]], /ROOM_FULL/, "Eve ne peut pas passer joueur (plein)");

// commit_room avec contrôle de version
const state = { round: 1, players: [{ id: U[0] }, { id: U[1] }, { id: U[2] }, { id: U[3] }], deciderId: U[0] };
const secret = { lots: { 1: { id: "c-cafard" } }, usedLotIds: [] };
const knowledge = [
  { userId: U[1], round: 1, containerId: 2, lot: { id: "c-japon", name: "Japon" } },
  { userId: U[2], round: 1, containerId: 3, lot: { id: "c-slip", name: "Slip" } },
];
const commit = async (version) =>
  (
    await db.query("select public.commit_room($1,$2,'playing',$3,$4,$5,$6,true) as ok", [
      roomId,
      version,
      settings,
      state,
      secret,
      JSON.stringify(knowledge),
    ])
  ).rows[0].ok;
ok((await commit(0)) === true, "commit_room version 0 accepté");
ok((await commit(0)) === false, "commit_room version périmée refusé");
const v = (await db.query("select version, status from rooms where id=$1", [roomId])).rows[0];
ok(v.version === 1 && v.status === "playing", "version incrémentée, statut playing");
ok((await db.query("select count(*)::int as n from player_knowledge")).rows[0].n === 2, "connaissances insérées");

// Spectateur rejoint en cours de partie → spectateur ; joueur de la partie qui revient → joueur
await db.query("delete from room_members where user_id=$1", [U[3]]);
ok((await join(U[3], "Dan")).role === "player", "joueur de la partie qui revient → joueur");
ok((await join(U[5], "Fred")).role === "spectator", "nouveau venu en cours de partie → spectateur");

// Messages
await db.query("insert into messages (room_id,user_id,name,channel,audience,body) values ($1,$2,'Bob','global',null,'salut')", [roomId, U[1]]);
await db.query("insert into messages (room_id,user_id,name,channel,audience,body) values ($1,$2,'Bob','participants',$3,'on bluffe ?')", [
  roomId,
  U[1],
  [U[1], U[2], U[3]],
]);

// --- RLS : on joue le rôle « authenticated » d'un utilisateur donné.
const as = async (uid, sql, params = []) => {
  await db.exec("set role authenticated");
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [uid]);
  try {
    return await db.query(sql, params);
  } finally {
    await db.exec("reset role");
  }
};
const asErr = async (uid, sql, pattern, msg) => {
  try {
    await as(uid, sql);
    ok(false, `${msg} (aucune erreur)`);
  } catch (e) {
    ok(pattern.test(e.message), `${msg} → ${e.message}`);
  }
};

ok((await as(U[1], "select id from rooms")).rows.length === 1, "RLS : un membre lit son salon");
ok((await as(U[6], "select id from rooms")).rows.length === 0, "RLS : un non-membre ne voit pas le salon");
ok((await as(U[6], "select * from room_members")).rows.length === 0, "RLS : un non-membre ne voit pas les membres");
await asErr(U[1], "select * from room_secrets", /permission denied/, "RLS : room_secrets illisible côté client");
const kb = await as(U[1], "select lot->>'name' as n from player_knowledge");
ok(kb.rows.length === 1 && kb.rows[0].n === "Japon", "RLS : Bob ne voit que ce qu'il a vu");
ok((await as(U[0], "select * from player_knowledge")).rows.length === 0, "RLS : le décideur ne voit aucun lot");
const deciderMsgs = await as(U[0], "select channel from messages");
ok(deciderMsgs.rows.length === 1 && deciderMsgs.rows[0].channel === "global", "RLS : le décideur ne voit pas le chat participants");
ok((await as(U[2], "select channel from messages")).rows.length === 2, "RLS : un participant voit les deux chats");
ok((await as(U[5], "select channel from messages")).rows.length === 1, "RLS : un spectateur ne voit que le chat global");
await asErr(U[1], "update rooms set status='lobby'", /permission denied/, "client : écriture sur rooms interdite");
await asErr(U[1], "insert into messages (room_id,name,channel,body) values ('" + roomId + "','x','global','hack')", /permission denied/, "client : insertion de message interdite");
await asErr(U[1], `select public.commit_room('${roomId}',1,'lobby','{}','{}','{}','[]',false)`, /permission denied/, "client : commit_room interdit");
await asErr(U[1], `select public.join_room('ABC123','${U[6]}','x',null,false)`, /permission denied/, "client : join_room interdit");
await asErr(U[1], "select * from public.list_public_rooms()", /permission denied/, "client : list_public_rooms réservé au serveur");

// list_public_rooms (serveur)
const pub = (await db.query("select * from public.list_public_rooms()")).rows;
ok(pub.length === 1 && pub[0].players === 4 && pub[0].host_name === "Alice", "list_public_rooms renvoie le salon public");

// leave_room : l'host part → transfert ; kick → ban
await db.query("select public.leave_room($1,$2,false)", [roomId, U[0]]);
const host = (await db.query("select host_id from rooms where id=$1", [roomId])).rows[0].host_id;
ok(host === U[1], "l'host quitte → Bob devient host");
await db.query("select public.leave_room($1,$2,true)", [roomId, U[2]]);
await expectError("select public.join_room('ABC123',$1,'Chloé',null,false)", [U[2]], /BANNED/, "joueur expulsé ne peut pas revenir");

// Dernier membre qui part → salon supprimé (cascade)
for (const u of [U[1], U[3], U[4], U[5]]) await db.query("select public.leave_room($1,$2,false)", [roomId, u]);
ok((await db.query("select count(*)::int as n from rooms")).rows[0].n === 0, "salon vide supprimé");
ok((await db.query("select count(*)::int as n from player_knowledge")).rows[0].n === 0, "cascade : connaissances supprimées");

const pubTables = (await db.query("select tablename from pg_publication_tables where pubname='supabase_realtime' order by 1")).rows.map((r) => r.tablename);
ok(pubTables.join(",") === "messages,player_knowledge,rooms", `publication realtime : ${pubTables.join(", ")}`);
