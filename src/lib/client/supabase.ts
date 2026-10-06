"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

// Écrit en accès littéraux pour que Next.js puisse les injecter au build.
// « publishable » est le nom actuel chez Supabase, « anon » l'ancien : les deux sont acceptés.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Client Supabase du navigateur, ou null si le site n'est pas configuré (mode démo seulement). */
export function supabaseBrowser(): SupabaseClient | null {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  client ??= createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  return client;
}

export const isOnlineConfigured = () => Boolean(SUPABASE_URL && SUPABASE_KEY);

/** Appel d'une route API authentifiée. Lève une Error avec le message serveur. */
export async function api<T = { ok: true }>(path: string, body?: unknown, method = "POST"): Promise<T> {
  const sb = supabaseBrowser();
  const token = (await sb?.auth.getSession())?.data.session?.access_token;
  const res = await fetch(path, {
    method,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: method === "GET" ? undefined : JSON.stringify(body ?? {}),
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(data.error ?? "Oups, quelque chose a coincé.");
  return data as T;
}
