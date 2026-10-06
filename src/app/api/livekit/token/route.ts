import { AccessToken, TrackSource } from "livekit-server-sdk";
import { z } from "zod";
import { normalizeSettings } from "@/lib/game/settings";
import { HttpError, readJson, route } from "@/lib/server/http";
import { loadRoom, requireMember } from "@/lib/server/rooms";
import { requireUser } from "@/lib/server/supabase";

/** Jeton d'accès à la salle vidéo LiveKit du salon. */
export const POST = route(async (req: Request) => {
  const { identity } = await requireUser(req);
  const { code } = await readJson(req, z.object({ code: z.string().min(1).max(12) }));
  const room = await loadRoom(code);
  const member = await requireMember(room.id, identity.id);
  const settings = normalizeSettings(room.settings);

  if (!settings.video && !settings.audio) return { token: null, url: null };

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const url = process.env.LIVEKIT_URL;
  if (!apiKey || !apiSecret || !url) throw new HttpError(503, "La vidéo n'est pas configurée sur ce serveur.");

  const sources: TrackSource[] = [];
  if (settings.video) sources.push(TrackSource.CAMERA);
  if (settings.audio) sources.push(TrackSource.MICROPHONE);

  const at = new AccessToken(apiKey, apiSecret, {
    identity: identity.id,
    name: member.name,
    metadata: JSON.stringify({ avatar: member.avatar_url }),
    ttl: "6h",
  });
  at.addGrant({
    room: `dcds-${room.id}`,
    roomJoin: true,
    canSubscribe: true,
    canPublish: member.role === "player",
    canPublishSources: sources,
    canPublishData: false,
  });
  return { token: await at.toJwt(), url };
});
