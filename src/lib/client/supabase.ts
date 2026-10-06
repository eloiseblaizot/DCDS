"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/** Client Supabase du navigateur, ou null si le site n'est pas configuré (mode démo seulement). */
export function supabaseBrowser(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  client ??= createClient(url, key, {
    auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  return client;
}

export const isOnlineConfigured = () =>
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

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
