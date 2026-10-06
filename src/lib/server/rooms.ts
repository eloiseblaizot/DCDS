import "server-only";
import type { PostgrestError } from "@supabase/supabase-js";
import type { GameSecret, GameState, KnowledgeEntry, RoomSettings } from "@/lib/game/types";
import { HttpError } from "./http";
import { supabaseAdmin } from "./supabase";

export type RoomStatus = "lobby" | "playing" | "finished";

export interface RoomRow {
  id: string;
  code: string;
  host_id: string;
  is_public: boolean;
  status: RoomStatus;
  settings: RoomSettings;
  state: GameState | null;
  version: number;
}

export interface LoadedRoom extends RoomRow {
  secret: GameSecret;
}

export interface MemberRow {
  user_id: string;
  name: string;
  avatar_url: string | null;
  role: "player" | "spectator";
  joined_at: string;
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function newRoomCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}

export function normalizeCode(code: string): string {
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
}

/** Traduit les exceptions levées par les fonctions SQL. */
export function rpcError(error: PostgrestError): HttpError {
  const msg = error.message ?? "";
  if (msg.includes("ROOM_NOT_FOUND")) return new HttpError(404, "Salon introuvable. Vérifie le code !");
  if (msg.includes("BANNED")) return new HttpError(403, "Tu as été expulsé de ce salon.");
  if (msg.includes("ROOM_FULL")) return new HttpError(409, "Le salon est complet.");
  if (msg.includes("GAME_RUNNING")) return new HttpError(409, "La partie a déjà commencé.");
  console.error(error);
  return new HttpError(500, "Erreur base de données, réessaie.");
}

export async function loadRoom(code: string): Promise<LoadedRoom> {
  const { data, error } = await supabaseAdmin()
    .from("rooms")
    .select("id, code, host_id, is_public, status, settings, state, version, room_secrets(secret)")
    .eq("code", normalizeCode(code))
    .maybeSingle();
  if (error) throw rpcError(error);
  if (!data) throw new HttpError(404, "Salon introuvable. Vérifie le code !");
  const rel = (data as { room_secrets?: { secret: GameSecret } | { secret: GameSecret }[] | null }).room_secrets;
  const secretRow = Array.isArray(rel) ? rel[0] : rel;
  const { room_secrets: _ignored, ...room } = data as RoomRow & { room_secrets?: unknown };
  void _ignored;
  return { ...room, secret: secretRow?.secret ?? { lots: {}, usedLotIds: [] } };
}

export async function getMember(roomId: string, userId: string): Promise<MemberRow | null> {
  const { data, error } = await supabaseAdmin()
    .from("room_members")
    .select("user_id, name, avatar_url, role, joined_at")
    .eq("room_id", roomId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw rpcError(error);
  return data as MemberRow | null;
}

export async function requireMember(roomId: string, userId: string): Promise<MemberRow> {
  const member = await getMember(roomId, userId);
  if (!member) throw new HttpError(403, "Tu ne fais pas partie de ce salon.");
  return member;
}

export async function listPlayers(roomId: string): Promise<MemberRow[]> {
  const { data, error } = await supabaseAdmin()
    .from("room_members")
    .select("user_id, name, avatar_url, role, joined_at")
    .eq("room_id", roomId)
    .eq("role", "player")
    .order("joined_at", { ascending: true });
  if (error) throw rpcError(error);
  return (data ?? []) as MemberRow[];
}

export interface RoomCommit {
  status: RoomStatus;
  settings: RoomSettings;
  state: GameState | null;
  secret: GameSecret;
  knowledge?: KnowledgeEntry[];
  clearKnowledge?: boolean;
}

/**
 * Lit le salon, applique `fn`, puis écrit le résultat si personne n'a modifié
 * le salon entre-temps (sinon on recommence). C'est ce qui garantit le
 * « premier arrivé, premier servi » quand deux joueurs cliquent en même temps.
 */
export async function mutateRoom(code: string, fn: (room: LoadedRoom) => Promise<RoomCommit> | RoomCommit) {
  for (let attempt = 0; attempt < 8; attempt++) {
    const room = await loadRoom(code);
    const next = await fn(room);
    const { data, error } = await supabaseAdmin().rpc("commit_room", {
      p_room: room.id,
      p_version: room.version,
      p_status: next.status,
      p_settings: next.settings,
      p_state: next.state,
      p_secret: next.secret,
      p_knowledge: next.knowledge ?? [],
      p_clear_knowledge: next.clearKnowledge ?? false,
    });
    if (error) throw rpcError(error);
    if (data === true) return;
    await new Promise((r) => setTimeout(r, 15 + Math.random() * 60));
  }
  throw new HttpError(409, "Trop d'actions en même temps, réessaie !");
}
