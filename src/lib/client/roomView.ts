import type { RoomAction } from "@/lib/game/actions";
import type { GameAction, GameState, KnowledgeEntry, RoomSettings } from "@/lib/game/types";

export type RoomStatus = "lobby" | "playing" | "finished";

export interface MemberView {
  id: string;
  name: string;
  avatar: string | null;
  role: "player" | "spectator";
  online: boolean;
}

export interface ChatMessage {
  id: string | number;
  userId: string | null;
  name: string;
  channel: "global" | "participants";
  body: string;
  at: number;
}

/**
 * Tout ce dont l'interface a besoin pour afficher un salon.
 * Deux implémentations : en ligne (Supabase) et démo locale (bots).
 */
export interface RoomView {
  mode: "online" | "demo";
  code: string;
  me: { id: string; name: string; avatar: string | null };
  hostId: string;
  status: RoomStatus;
  settings: RoomSettings;
  state: GameState | null;
  members: MemberView[];
  /** Ce que JE sais du contenu des conteneurs (manche en cours). */
  knowledge: KnowledgeEntry[];
  messages: ChatMessage[];
  pending: boolean;
  error: string | null;
  clearError(): void;
  gameAction(action: GameAction, opts?: { silent?: boolean }): Promise<boolean>;
  roomAction(action: RoomAction): Promise<boolean>;
  sendChat(channel: ChatMessage["channel"], body: string): Promise<boolean>;
  leave(): Promise<void>;
}

export function isHost(view: RoomView) {
  return view.hostId === view.me.id;
}
