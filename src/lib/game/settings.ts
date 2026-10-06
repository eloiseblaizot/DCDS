import { z } from "zod";
import type { JokerKey, RoomSettings } from "./types";

export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 12;
export const ROUND_LIMITS = [0, 3, 5, 10, 15] as const;
export const EMERGENCY_CONTAINER_ID = 99;

/** Couleurs des conteneurs, dans l'ordre de leurs numéros. */
export const CONTAINER_COLORS = [
  "#5496ff",
  "#ff54ff",
  "#f58d25",
  "#4bf525",
  "#ffe814",
  "#ff4f5e",
  "#22d3ee",
  "#a26bff",
  "#ff9ec7",
  "#00c896",
  "#ffb627",
  "#8f9bff",
];

export const JOKERS: Record<JokerKey, { name: string; short: string; description: string }> = {
  trust: {
    name: "Confiance",
    short: "Confiance",
    description: "Envoie un participant regarder le contenu de TON conteneur.",
  },
  switch: {
    name: "Switch",
    short: "Switch",
    description: "Échange les conteneurs de deux participants. Chacun découvre son nouveau conteneur.",
  },
  spy: {
    name: "Espion",
    short: "Espion",
    description: "Envoie un participant espionner le conteneur d'un autre. Il peut dire la vérité… ou mentir.",
  },
  steal: {
    name: "Vol de conteneur",
    short: "Vol",
    description: "Fin de manche : vole le conteneur d'un participant et donne-lui le tien.",
  },
  emergency: {
    name: "Conteneur d'urgence",
    short: "Urgence",
    description: "Une fois par partie : échange ton conteneur contre le conteneur d'urgence, au contenu aléatoire.",
  },
};

export const JOKER_ORDER: JokerKey[] = ["trust", "switch", "spy", "steal", "emergency"];

export const DEFAULT_SETTINGS: RoomSettings = {
  maxPlayers: 8,
  isPublic: false,
  video: true,
  audio: true,
  chatParticipants: true,
  chatGlobal: true,
  jokers: { trust: true, switch: true, spy: true, steal: true, emergency: true },
  roundMinutes: 0,
  lotsMode: "catalog",
  customLots: [],
};

const lotSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().trim().min(1).max(80),
  emoji: z.string().trim().min(1).max(16),
  tier: z.enum(["nul", "bof", "cool", "top", "legendaire"]),
  value: z.number().int().min(0).max(10_000_000),
  custom: z.boolean().optional(),
});

export const settingsSchema = z.object({
  maxPlayers: z.number().int().min(4).max(MAX_PLAYERS),
  isPublic: z.boolean(),
  video: z.boolean(),
  audio: z.boolean(),
  chatParticipants: z.boolean(),
  chatGlobal: z.boolean(),
  jokers: z.object({
    trust: z.boolean(),
    switch: z.boolean(),
    spy: z.boolean(),
    steal: z.boolean(),
    emergency: z.boolean(),
  }),
  roundMinutes: z.union(ROUND_LIMITS.map((n) => z.literal(n)) as [z.ZodLiteral<0>, ...z.ZodLiteral<number>[]]),
  lotsMode: z.enum(["catalog", "custom", "mixed"]),
  customLots: z.array(lotSchema).max(120),
});

export function normalizeSettings(input: unknown): RoomSettings {
  const merged = { ...DEFAULT_SETTINGS, ...(typeof input === "object" && input ? input : {}) };
  const parsed = settingsSchema.safeParse(merged);
  return parsed.success ? (parsed.data as RoomSettings) : DEFAULT_SETTINGS;
}
