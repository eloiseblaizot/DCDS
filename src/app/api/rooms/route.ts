import { z } from "zod";
import { normalizeSettings } from "@/lib/game/settings";
import { HttpError, readJson, route } from "@/lib/server/http";
import { newRoomCode, rpcError } from "@/lib/server/rooms";
import { requireUser, supabaseAdmin } from "@/lib/server/supabase";

/** Crée un salon et y installe l'host. */
export const POST = route(async (req: Request) => {
  const { identity } = await requireUser(req);
  const body = await readJson(req, z.object({ settings: z.unknown().optional() }));
  const settings = normalizeSettings(body.settings);

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = newRoomCode();
    const { error } = await supabaseAdmin().rpc("create_room", {
      p_code: code,
      p_user: identity.id,
      p_name: identity.name,
      p_avatar: identity.avatar,
      p_settings: settings,
    });
    if (!error) return { code };
    if (error.code !== "23505") throw rpcError(error);
  }
  throw new HttpError(500, "Impossible de générer un code de salon, réessaie.");
});
