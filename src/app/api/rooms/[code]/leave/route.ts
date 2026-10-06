import { route } from "@/lib/server/http";
import { loadRoom, rpcError } from "@/lib/server/rooms";
import { requireUser, supabaseAdmin } from "@/lib/server/supabase";

type Ctx = { params: Promise<{ code: string }> };

export const POST = route(async (req: Request, ctx: Ctx) => {
  const { code } = await ctx.params;
  const { identity } = await requireUser(req);
  const room = await loadRoom(code);
  const { error } = await supabaseAdmin().rpc("leave_room", { p_room: room.id, p_user: identity.id, p_ban: false });
  if (error) throw rpcError(error);
  return { ok: true };
});
