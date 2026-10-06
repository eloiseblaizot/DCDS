import "server-only";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { HttpError } from "./http";
import { identityOf, type Identity } from "@/lib/identity";

let admin: SupabaseClient | null = null;

export function supabaseAdmin(): SupabaseClient {
  if (admin) return admin;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new HttpError(500, "Configuration Supabase manquante (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).");
  }
  admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return admin;
}

export async function requireUser(req: Request): Promise<{ user: User; identity: Identity }> {
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) throw new HttpError(401, "Connecte-toi pour jouer.");
  const { data, error } = await supabaseAdmin().auth.getUser(token);
  if (error || !data.user) throw new HttpError(401, "Session expirée, reconnecte-toi.");
  return { user: data.user, identity: identityOf(data.user) };
}
