export type Tier = "nul" | "bof" | "cool" | "top" | "legendaire";

export interface Lot {
  id: string;
  name: string;
  emoji: string;
  tier: Tier;
  /** Valeur fictive en euros, sert au classement. */
  value: number;
  custom?: boolean;
}

export type JokerKey = "trust" | "switch" | "spy" | "steal" | "emergency";

export type LotsMode = "catalog" | "custom" | "mixed";

export interface RoomSettings {
  maxPlayers: number;
  isPublic: boolean;
  video: boolean;
  audio: boolean;
  /** Chat réservé aux participants : le décideur de la manche ne le voit pas. */
  chatParticipants: boolean;
  /** Chat ouvert à tout le salon (décideur et spectateurs compris). */
  chatGlobal: boolean;
  jokers: Record<JokerKey, boolean>;
  /** Durée max d'une manche en minutes, 0 = illimité. */
  roundMinutes: number;
  lotsMode: LotsMode;
  customLots: Lot[];
}

export interface Player {
  id: string;
  name: string;
  avatar: string | null;
}

export type Phase =
  | "nomination"
  | "picking"
  | "discovery"
  | "decider"
  | "reveal"
  | "results"
  | "game_over";

export interface ContainerPub {
  id: number;
  color: string;
  ownerId: string | null;
  /** Joueurs ayant vu le contenu (info publique). */
  seenBy: string[];
  /** Conteneur d'urgence (invoqué par le décideur). */
  emergency?: boolean;
  /** Ancien conteneur du décideur, abandonné au profit du conteneur d'urgence. */
  discarded?: boolean;
  /** Contenu, uniquement une fois révélé à tous. */
  lot?: Lot;
}

export interface ViewStep {
  viewerId: string;
  containerId: number;
}

export interface JokerAction {
  type: "spy" | "switch" | "trust";
  steps: ViewStep[];
  index: number;
  opened: boolean;
}

export interface DiscoveryTurn {
  order: string[];
  index: number;
  opened: boolean;
}

export type LogKind =
  | "round"
  | "decider"
  | "pick"
  | "open"
  | "spy"
  | "switch"
  | "trust"
  | "emergency"
  | "steal"
  | "lock"
  | "timeout"
  | "reveal"
  | "results"
  | "game_over"
  | "skip";

export interface LogEntry {
  id: number;
  at: number;
  kind: LogKind;
  text: string;
}

export interface RoundResult {
  round: number;
  deciderId: string;
  entries: { playerId: string; containerId: number; lot: Lot }[];
}

export type EndReason = "keep" | "steal" | "timeout";

export interface GameState {
  round: number;
  totalRounds: number;
  phase: Phase;
  players: Player[];
  deciderId: string | null;
  pastDeciders: string[];
  /** Comment le décideur a été désigné (pour l'animation). */
  deciderMethod: "volunteer" | "draw" | "last" | null;
  containers: ContainerPub[];
  pickOrder: string[];
  turn: DiscoveryTurn | null;
  action: JokerAction | null;
  jokersUsed: { trust: boolean; switch: boolean; spy: boolean };
  emergencyUsed: boolean;
  revealOrder: number[];
  revealed: number;
  endReason: EndReason | null;
  deadline: number | null;
  scores: Record<string, number>;
  history: RoundResult[];
  log: LogEntry[];
  logSeq: number;
}

export interface GameSecret {
  /** containerId -> lot, pour la manche en cours. */
  lots: Record<number, Lot>;
  usedLotIds: string[];
}

export interface KnowledgeEntry {
  userId: string;
  round: number;
  containerId: number;
  lot: Lot;
}

export type GameAction =
  | { type: "volunteer" }
  | { type: "draw_decider" }
  | { type: "pick"; containerId: number }
  | { type: "open" }
  | { type: "done" }
  | { type: "joker_spy"; spyId: string; containerId: number }
  | { type: "joker_switch"; a: string; b: string }
  | { type: "joker_trust"; viewerId: string }
  | { type: "joker_emergency" }
  | { type: "steal"; targetId: string }
  | { type: "lock" }
  | { type: "reveal_next" }
  | { type: "next_round" }
  | { type: "skip" }
  | { type: "timeout" };

export interface EngineContext {
  actorId: string;
  isHost: boolean;
  now: number;
  rng: () => number;
  settings: RoomSettings;
}

export type EngineResult =
  | { ok: true; state: GameState; secret: GameSecret; knowledge: KnowledgeEntry[] }
  | { ok: false; error: string };
