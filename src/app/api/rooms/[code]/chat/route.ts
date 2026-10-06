import { chatRequestSchema } from "@/lib/game/actions";
import { isParticipant } from "@/lib/game/selectors";
import { normalizeSettings } from "@/lib/game/settings";
import { HttpError, readJson, route } from "@/lib/server/http";
import { loadRoom, requireMember, rpcError } from "@/lib/server/rooms";
import { requireUser, supabaseAdmin } from "@/lib/server/supabase";

type Ctx = { params: Promise<{ code: string }> };

export const POST = route(async (req: Request, ctx: Ctx) => {
  const { code } = await ctx.params;
  const { identity } = await requireUser(req);
  const body = await readJson(req, chatRequestSchema);
  const room = await loadRoom(code);
  const member = await requireMember(room.id, identity.id);
  const settings = normalizeSettings(room.settings);

  let audience: string[] | null = null;
  if (body.channel === "global") {
    if (!settings.chatGlobal) throw new HttpError(403, "Le chat global est désactivé.");
  } else {
    if (!settings.chatParticipants) throw new HttpError(403, "Le chat des participants est désactivé.");
    const s = room.state;
    if (!s || room.status !== "playing" || s.phase === "game_over") {
      throw new HttpError(409, "Le chat des participants s'ouvre pendant la partie.");
    }
    if (!isParticipant(s, identity.id)) throw new HttpError(403, "Réservé aux participants (pas au décideur 😉).");
    audience = s.players.filter((p) => p.id !== s.deciderId).map((p) => p.id);
  }

  const { error } = await supabaseAdmin().from("messages").insert({
    room_id: room.id,
    user_id: identity.id,
    name: member.name,
    channel: body.channel,
    audience,
    body: body.body,
  });
  if (error) throw rpcError(error);
  return { ok: true };
});
