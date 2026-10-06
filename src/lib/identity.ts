import type { User } from "@supabase/supabase-js";

export interface Identity {
  id: string;
  name: string;
  avatar: string | null;
  isGuest: boolean;
}

/** Pseudo + avatar d'un utilisateur Supabase (invité ou connecté via Discord). */
export function identityOf(user: User): Identity {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const claims = (meta.custom_claims ?? {}) as Record<string, unknown>;
  const pick = (...values: unknown[]) => values.find((v): v is string => typeof v === "string" && v.trim().length > 0);
  const name = pick(meta.display_name, claims.global_name, meta.full_name, meta.name, meta.user_name) ?? "Joueur";
  return {
    id: user.id,
    name: name.trim().slice(0, 24),
    avatar: pick(meta.avatar_url, meta.picture) ?? null,
    isGuest: user.is_anonymous ?? !user.app_metadata?.provider,
  };
}
