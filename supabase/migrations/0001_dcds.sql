-- DCDS : schéma de base.
-- À exécuter une fois dans Supabase (SQL Editor > New query > coller > Run).
--
-- Principe de sécurité : toutes les écritures passent par les routes API Next.js
-- (clé service_role). Les clients ne font que LIRE, et la RLS garantit que :
--   * l'état public d'un salon n'est lisible que par ses membres ;
--   * le contenu des conteneurs (room_secrets) n'est lisible par personne côté client ;
--   * chaque joueur ne reçoit que ce qu'il a lui-même vu (player_knowledge) ;
--   * le chat « participants » est invisible pour le décideur de la manche.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- tables

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  host_id uuid not null references auth.users (id) on delete cascade,
  is_public boolean not null default false,
  status text not null default 'lobby' check (status in ('lobby', 'playing', 'finished')),
  settings jsonb not null,
  state jsonb,
  version integer not null default 0,
  members_rev integer not null default 0,
  banned uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists rooms_public_idx on public.rooms (is_public, status, updated_at desc);

create table if not exists public.room_secrets (
  room_id uuid primary key references public.rooms (id) on delete cascade,
  secret jsonb not null default '{}'::jsonb
);

create table if not exists public.room_members (
  room_id uuid not null references public.rooms (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  avatar_url text,
  role text not null default 'player' check (role in ('player', 'spectator')),
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);
create index if not exists room_members_user_idx on public.room_members (user_id);

create table if not exists public.player_knowledge (
  id bigint generated always as identity primary key,
  room_id uuid not null references public.rooms (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  round integer not null,
  container_id integer not null,
  lot jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists player_knowledge_lookup on public.player_knowledge (room_id, user_id);

create table if not exists public.messages (
  id bigint generated always as identity primary key,
  room_id uuid not null references public.rooms (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  name text not null,
  channel text not null check (channel in ('global', 'participants')),
  -- null = tout le salon ; sinon liste des destinataires autorisés.
  audience uuid[],
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);
create index if not exists messages_room_idx on public.messages (room_id, id desc);

-- ---------------------------------------------------------------- RLS

create or replace function public.is_room_member(rid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.room_members m where m.room_id = rid and m.user_id = auth.uid()
  );
$$;

alter table public.rooms enable row level security;
alter table public.room_secrets enable row level security;
alter table public.room_members enable row level security;
alter table public.player_knowledge enable row level security;
alter table public.messages enable row level security;

drop policy if exists "members read room" on public.rooms;
create policy "members read room" on public.rooms
  for select to authenticated using (public.is_room_member(id));

drop policy if exists "members read members" on public.room_members;
create policy "members read members" on public.room_members
  for select to authenticated using (public.is_room_member(room_id));

drop policy if exists "own knowledge" on public.player_knowledge;
create policy "own knowledge" on public.player_knowledge
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "members read allowed messages" on public.messages;
create policy "members read allowed messages" on public.messages
  for select to authenticated using (
    public.is_room_member(room_id) and (audience is null or auth.uid() = any (audience))
  );

-- Aucune policy sur room_secrets : illisible côté client.
revoke all on public.room_secrets from anon, authenticated;
-- Les clients ne font que lire.
revoke insert, update, delete on public.rooms, public.room_members, public.player_knowledge, public.messages
  from anon, authenticated;

-- ---------------------------------------------------------------- fonctions serveur

create or replace function public.create_room(
  p_code text, p_user uuid, p_name text, p_avatar text, p_settings jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  rid uuid;
begin
  insert into public.rooms (code, host_id, is_public, settings)
  values (upper(p_code), p_user, coalesce((p_settings ->> 'isPublic')::boolean, false), p_settings)
  returning id into rid;
  insert into public.room_secrets (room_id) values (rid);
  insert into public.room_members (room_id, user_id, name, avatar_url, role)
  values (rid, p_user, p_name, p_avatar, 'player');
  return rid;
end;
$$;

create or replace function public.join_room(
  p_code text, p_user uuid, p_name text, p_avatar text, p_spectator boolean default false
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.rooms%rowtype;
  existing_role text;
  player_count integer;
  in_game boolean;
  new_role text;
begin
  select * into r from public.rooms where code = upper(p_code) for update;
  if not found then
    raise exception 'ROOM_NOT_FOUND';
  end if;
  if p_user = any (r.banned) then
    raise exception 'BANNED';
  end if;

  select m.role into existing_role from public.room_members m where m.room_id = r.id and m.user_id = p_user;
  if existing_role is not null then
    update public.room_members m set name = p_name, avatar_url = p_avatar
      where m.room_id = r.id and m.user_id = p_user;
    update public.rooms set members_rev = members_rev + 1 where id = r.id;
    return jsonb_build_object('room_id', r.id, 'role', existing_role);
  end if;

  select count(*) into player_count from public.room_members m where m.room_id = r.id and m.role = 'player';
  in_game := r.state is not null
    and (r.state -> 'players') @> jsonb_build_array(jsonb_build_object('id', p_user::text));

  if in_game then
    new_role := 'player';
  elsif p_spectator or r.status <> 'lobby' or player_count >= coalesce((r.settings ->> 'maxPlayers')::int, 8) then
    new_role := 'spectator';
  else
    new_role := 'player';
  end if;

  insert into public.room_members (room_id, user_id, name, avatar_url, role)
  values (r.id, p_user, p_name, p_avatar, new_role);
  update public.rooms set members_rev = members_rev + 1, updated_at = now() where id = r.id;
  return jsonb_build_object('room_id', r.id, 'role', new_role);
end;
$$;

create or replace function public.set_member_role(p_room uuid, p_user uuid, p_role text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.rooms%rowtype;
  player_count integer;
begin
  select * into r from public.rooms where id = p_room for update;
  if not found then
    raise exception 'ROOM_NOT_FOUND';
  end if;
  if p_role = 'player' then
    if r.status <> 'lobby' then
      raise exception 'GAME_RUNNING';
    end if;
    select count(*) into player_count from public.room_members m
      where m.room_id = p_room and m.role = 'player' and m.user_id <> p_user;
    if player_count >= coalesce((r.settings ->> 'maxPlayers')::int, 8) then
      raise exception 'ROOM_FULL';
    end if;
  end if;
  update public.room_members m set role = p_role where m.room_id = p_room and m.user_id = p_user;
  update public.rooms set members_rev = members_rev + 1 where id = p_room;
  return p_role;
end;
$$;

create or replace function public.leave_room(p_room uuid, p_user uuid, p_ban boolean default false)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.rooms%rowtype;
  next_host uuid;
begin
  select * into r from public.rooms where id = p_room for update;
  if not found then
    return;
  end if;
  delete from public.room_members m where m.room_id = p_room and m.user_id = p_user;
  if p_ban then
    update public.rooms set banned = array_append(banned, p_user) where id = p_room;
  end if;
  if r.host_id = p_user then
    select m.user_id into next_host from public.room_members m
      where m.room_id = p_room
      order by (m.role = 'player') desc, m.joined_at asc
      limit 1;
    if next_host is null then
      delete from public.rooms where id = p_room;
      return;
    end if;
    update public.rooms set host_id = next_host where id = p_room;
  end if;
  update public.rooms set members_rev = members_rev + 1, updated_at = now() where id = p_room;
end;
$$;

-- Écriture atomique de l'état d'un salon, avec contrôle de version (optimistic locking).
create or replace function public.commit_room(
  p_room uuid,
  p_version integer,
  p_status text,
  p_settings jsonb,
  p_state jsonb,
  p_secret jsonb,
  p_knowledge jsonb,
  p_clear_knowledge boolean default false
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.rooms
     set status = p_status,
         settings = p_settings,
         is_public = coalesce((p_settings ->> 'isPublic')::boolean, false),
         state = p_state,
         version = version + 1,
         updated_at = now()
   where id = p_room and version = p_version;
  if not found then
    return false;
  end if;

  insert into public.room_secrets (room_id, secret)
  values (p_room, coalesce(p_secret, '{}'::jsonb))
  on conflict (room_id) do update set secret = excluded.secret;

  if p_clear_knowledge then
    delete from public.player_knowledge where room_id = p_room;
  end if;

  if p_knowledge is not null and jsonb_array_length(p_knowledge) > 0 then
    insert into public.player_knowledge (room_id, user_id, round, container_id, lot)
    select p_room, (k ->> 'userId')::uuid, (k ->> 'round')::int, (k ->> 'containerId')::int, k -> 'lot'
      from jsonb_array_elements(p_knowledge) as k;
  end if;
  return true;
end;
$$;

create or replace function public.list_public_rooms()
returns table (code text, host_name text, players integer, max_players integer, status text, created_at timestamptz)
language sql
security definer
stable
set search_path = public
as $$
  select r.code,
         coalesce(h.name, 'Host'),
         (select count(*)::int from public.room_members m where m.room_id = r.id and m.role = 'player'),
         coalesce((r.settings ->> 'maxPlayers')::int, 8),
         r.status,
         r.created_at
    from public.rooms r
    left join public.room_members h on h.room_id = r.id and h.user_id = r.host_id
   where r.is_public
     and r.status in ('lobby', 'playing')
     and r.updated_at > now() - interval '3 hours'
   order by (r.status = 'lobby') desc, r.created_at desc
   limit 50;
$$;

revoke execute on function public.create_room(text, uuid, text, text, jsonb) from public, anon, authenticated;
revoke execute on function public.join_room(text, uuid, text, text, boolean) from public, anon, authenticated;
revoke execute on function public.set_member_role(uuid, uuid, text) from public, anon, authenticated;
revoke execute on function public.leave_room(uuid, uuid, boolean) from public, anon, authenticated;
revoke execute on function public.commit_room(uuid, integer, text, jsonb, jsonb, jsonb, jsonb, boolean) from public, anon, authenticated;
revoke execute on function public.list_public_rooms() from public, anon, authenticated;
grant execute on function public.create_room(text, uuid, text, text, jsonb) to service_role;
grant execute on function public.join_room(text, uuid, text, text, boolean) to service_role;
grant execute on function public.set_member_role(uuid, uuid, text) to service_role;
grant execute on function public.leave_room(uuid, uuid, boolean) to service_role;
grant execute on function public.commit_room(uuid, integer, text, jsonb, jsonb, jsonb, jsonb, boolean) to service_role;
grant execute on function public.list_public_rooms() to service_role;

-- Nettoyage manuel des vieux salons (à lancer de temps en temps, ou via pg_cron) :
--   delete from public.rooms where updated_at < now() - interval '2 days';

-- ---------------------------------------------------------------- temps réel

do $$
begin
  begin
    alter publication supabase_realtime add table public.rooms;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.player_knowledge;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.messages;
  exception when duplicate_object then null;
  end;
end;
$$;
