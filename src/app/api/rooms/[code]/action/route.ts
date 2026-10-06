import { actionRequestSchema, type RoomAction } from "@/lib/game/actions";
import { applyAction, createGame } from "@/lib/game/engine";
import { MIN_PLAYERS, normalizeSettings } from "@/lib/game/settings";
import type { Identity } from "@/lib/identity";
import { HttpError, readJson, route } from "@/lib/server/http";
import { listPlayers, loadRoom, mutateRoom, requireMember, rpcError, type LoadedRoom } from "@/lib/server/rooms";
import { requireUser, supabaseAdmin } from "@/lib/server/supabase";

type Ctx = { params: Promise<{ code: string }> };

export const POST = route(async (req: Request, ctx: Ctx) => {
  const { code } = await ctx.params;
  const { identity } = await requireUser(req);
  const body = await readJson(req, actionRequestSchema);

  if (body.kind === "room") return roomAction(code, identity, body.action);

  let checked = false;
  await mutateRoom(code, async (room) => {
    if (!checked) {
      await requireMember(room.id, identity.id);
      checked = true;
    }
    if (room.status === "lobby" || !room.state) throw new HttpError(409, "Aucune partie en cours.");
    const settings = normalizeSettings(room.settings);
    const res = applyAction(room.state, room.secret, body.action, {
      actorId: identity.id,
      isHost: room.host_id === identity.id,
      now: Date.now(),
      rng: Math.random,
      settings,
    });
    if (!res.ok) throw new HttpError(422, res.error);
    return {
      status: res.state.phase === "game_over" ? "finished" : "playing",
      settings,
      state: res.state,
      secret: res.secret,
      knowledge: res.knowledge,
    };
  });
  return { ok: true };
});

function requireHost(room: LoadedRoom, identity: Identity) {
  if (room.host_id !== identity.id) throw new HttpError(403, "Réservé à l'host de la partie.");
}

async function roomAction(code: string, identity: Identity, action: RoomAction) {
  const admin = supabaseAdmin();

  switch (action.type) {
    case "start":
      await mutateRoom(code, async (room) => {
        requireHost(room, identity);
        if (room.status === "playing") throw new HttpError(409, "La partie a déjà commencé.");
        const settings = normalizeSettings(room.settings);
        const members = await listPlayers(room.id);
        if (members.length < MIN_PLAYERS) throw new HttpError(409, `Il faut au moins ${MIN_PLAYERS} joueurs.`);
        if (members.length > settings.maxPlayers) {
          throw new HttpError(409, `Trop de joueurs (${members.length}/${settings.maxPlayers}). Passe quelqu'un en spectateur.`);
        }
        const players = members.map((m) => ({ id: m.user_id, name: m.name, avatar: m.avatar_url }));
        const { state, secret } = createGame(players, { now: Date.now(), rng: Math.random, settings });
        return { status: "playing", settings, state, secret, clearKnowledge: true };
      });
      return { ok: true };

    case "settings":
      await mutateRoom(code, (room) => {
        requireHost(room, identity);
        if (room.status === "playing") throw new HttpError(409, "Les réglages se changent entre deux parties.");
        return { status: room.status, settings: normalizeSettings(action.settings), state: room.state, secret: room.secret };
      });
      return { ok: true };

    case "back_to_lobby":
      await mutateRoom(code, (room) => {
        requireHost(room, identity);
        return {
          status: "lobby",
          settings: room.settings,
          state: null,
          secret: { lots: {}, usedLotIds: [] },
          clearKnowledge: true,
        };
      });
      return { ok: true };

    case "kick": {
      const room = await loadRoom(code);
      requireHost(room, identity);
      if (action.userId === identity.id) throw new HttpError(400, "Tu ne peux pas t'expulser toi-même.");
      const { error } = await admin.rpc("leave_room", { p_room: room.id, p_user: action.userId, p_ban: true });
      if (error) throw rpcError(error);
      return { ok: true };
    }

    case "transfer_host": {
      const room = await loadRoom(code);
      requireHost(room, identity);
      await requireMember(room.id, action.userId);
      const { error } = await admin.from("rooms").update({ host_id: action.userId }).eq("id", room.id);
      if (error) throw rpcError(error);
      return { ok: true };
    }

    case "set_role": {
      const room = await loadRoom(code);
      await requireMember(room.id, identity.id);
      const { error } = await admin.rpc("set_member_role", { p_room: room.id, p_user: identity.id, p_role: action.role });
      if (error) throw rpcError(error);
      return { ok: true };
    }
  }
}
