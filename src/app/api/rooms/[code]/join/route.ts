import { z } from "zod";
import { readJson, route } from "@/lib/server/http";
import { normalizeCode, rpcError } from "@/lib/server/rooms";
import { requireUser, supabaseAdmin } from "@/lib/server/supabase";

type Ctx = { params: Promise<{ code: string }> };

/** Rejoint un salon : joueur si une place est libre, sinon spectateur. */
export const POST = route(async (req: Request, ctx: Ctx) => {
  const { code } = await ctx.params;
  const { identity } = await requireUser(req);
  const body = await readJson(req, z.object({ spectator: z.boolean().optional() }));
  const { data, error } = await supabaseAdmin().rpc("join_room", {
    p_code: normalizeCode(code),
    p_user: identity.id,
    p_name: identity.name,
    p_avatar: identity.avatar,
    p_spectator: body.spectator ?? false,
  });
  if (error) throw rpcError(error);
  const joined = data as { room_id: string; role: "player" | "spectator" };
  return { roomId: joined.room_id, role: joined.role };
});
