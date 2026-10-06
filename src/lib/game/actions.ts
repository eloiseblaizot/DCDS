import { z } from "zod";
import { settingsSchema } from "./settings";

const id = z.string().min(1).max(64);

export const gameActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("volunteer") }),
  z.object({ type: z.literal("draw_decider") }),
  z.object({ type: z.literal("pick"), containerId: z.number().int() }),
  z.object({ type: z.literal("open") }),
  z.object({ type: z.literal("done") }),
  z.object({ type: z.literal("joker_spy"), spyId: id, containerId: z.number().int() }),
  z.object({ type: z.literal("joker_switch"), a: id, b: id }),
  z.object({ type: z.literal("joker_trust"), viewerId: id }),
  z.object({ type: z.literal("joker_emergency") }),
  z.object({ type: z.literal("steal"), targetId: id }),
  z.object({ type: z.literal("lock") }),
  z.object({ type: z.literal("reveal_next") }),
  z.object({ type: z.literal("next_round") }),
  z.object({ type: z.literal("skip") }),
  z.object({ type: z.literal("timeout") }),
]);

export const roomActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("start") }),
  z.object({ type: z.literal("settings"), settings: settingsSchema }),
  z.object({ type: z.literal("kick"), userId: id }),
  z.object({ type: z.literal("transfer_host"), userId: id }),
  z.object({ type: z.literal("set_role"), role: z.enum(["player", "spectator"]) }),
  z.object({ type: z.literal("back_to_lobby") }),
]);

export type RoomAction = z.infer<typeof roomActionSchema>;

export const actionRequestSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("game"), action: gameActionSchema }),
  z.object({ kind: z.literal("room"), action: roomActionSchema }),
]);

export const chatRequestSchema = z.object({
  channel: z.enum(["global", "participants"]),
  body: z.string().trim().min(1).max(500),
});
