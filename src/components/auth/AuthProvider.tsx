"use client";

import type { Session } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/client/supabase";
import { identityOf, type Identity } from "@/lib/identity";

interface AuthValue {
  /** false tant qu'on ne sait pas encore si une session existe. */
  ready: boolean;
  /** false si Supabase n'est pas configuré (seul le mode démo fonctionne). */
  configured: boolean;
  session: Session | null;
  identity: Identity | null;
  playAsGuest(name: string): Promise<void>;
  signInWithDiscord(next?: string): Promise<void>;
  rename(name: string): Promise<void>;
  signOut(): Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const sb = supabaseBrowser();
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(!sb);

  useEffect(() => {
    if (!sb) return;
    sb.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data } = sb.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, [sb]);

  const playAsGuest = useCallback(
    async (name: string) => {
      if (!sb) throw new Error("Le jeu en ligne n'est pas configuré.");
      const display_name = name.trim().slice(0, 24);
      if (!display_name) throw new Error("Choisis un pseudo !");
      const current = (await sb.auth.getSession()).data.session;
      if (current) {
        const { error } = await sb.auth.updateUser({ data: { display_name } });
        if (error) throw error;
        await sb.auth.refreshSession();
        return;
      }
      const { error } = await sb.auth.signInAnonymously({ options: { data: { display_name } } });
      if (error) throw new Error(error.message.includes("disabled") ? "Les invités ne sont pas activés sur ce serveur." : error.message);
    },
    [sb],
  );

  const signInWithDiscord = useCallback(
    async (next?: string) => {
      if (!sb) throw new Error("Le jeu en ligne n'est pas configuré.");
      const target = next ?? window.location.pathname + window.location.search;
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(target)}`;
      const { error } = await sb.auth.signInWithOAuth({
        provider: "discord",
        options: { redirectTo, scopes: "identify" },
      });
      if (error) throw error;
    },
    [sb],
  );

  const rename = useCallback(
    async (name: string) => {
      if (!sb) return;
      const display_name = name.trim().slice(0, 24);
      if (!display_name) return;
      const { error } = await sb.auth.updateUser({ data: { display_name } });
      if (error) throw error;
      await sb.auth.refreshSession();
    },
    [sb],
  );

  const signOut = useCallback(async () => {
    await sb?.auth.signOut();
  }, [sb]);

  const value = useMemo<AuthValue>(
    () => ({
      ready,
      configured: Boolean(sb),
      session,
      identity: session ? identityOf(session.user) : null,
      playAsGuest,
      signInWithDiscord,
      rename,
      signOut,
    }),
    [ready, sb, session, playAsGuest, signInWithDiscord, rename, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth hors AuthProvider");
  return ctx;
}
