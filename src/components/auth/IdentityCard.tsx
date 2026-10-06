"use client";

import { useState } from "react";
import { ClayCloud } from "@/components/art/ClayCloud";
import { useAuth } from "./AuthProvider";

function DiscordIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
      <path d="M20.3 4.4A19.6 19.6 0 0 0 15.4 3l-.6 1.3a18.2 18.2 0 0 0-5.6 0L8.6 3a19.6 19.6 0 0 0-4.9 1.4C.6 9 0 13.5.3 18a19.8 19.8 0 0 0 6 3l1.3-2a12.8 12.8 0 0 1-2-1l.5-.4a14 14 0 0 0 11.8 0l.5.4-2 1 1.3 2a19.7 19.7 0 0 0 6-3c.4-5.2-.7-9.7-3.4-13.6ZM8.7 15.3c-1.2 0-2.1-1.1-2.1-2.4s.9-2.4 2.1-2.4 2.2 1.1 2.1 2.4c0 1.3-.9 2.4-2.1 2.4Zm6.6 0c-1.2 0-2.1-1.1-2.1-2.4s.9-2.4 2.1-2.4 2.2 1.1 2.1 2.4c0 1.3-.9 2.4-2.1 2.4Z" />
    </svg>
  );
}

export { DiscordIcon };

/** Choix du pseudo (invité) ou connexion Discord. */
export function IdentityCard({
  title = "Qui es-tu ?",
  onDone,
  bare = false,
}: {
  title?: string;
  onDone?: () => void;
  bare?: boolean;
}) {
  const { identity, playAsGuest, signInWithDiscord, configured } = useAuth();
  const [name, setName] = useState(identity?.name ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await playAsGuest(name);
      onDone?.();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={bare ? "w-full" : "clay clay-grain mx-auto w-full max-w-md p-6 sm:p-8"}>
      {!bare && (
        <div className="-mt-20 mb-2 flex justify-center">
          <ClayCloud variant="face" className="h-28 w-36 animate-float" />
        </div>
      )}
      {!bare && <h2 className="text-center text-2xl font-bold">{title}</h2>}
      {!configured ? (
        <p className="mt-3 text-center text-ink-soft">
          Le jeu en ligne n&apos;est pas encore configuré sur ce serveur. Tu peux quand même essayer le mode solo !
        </p>
      ) : (
        <>
          <form onSubmit={submit} className="mt-5 space-y-3">
            <label className="block text-sm font-semibold text-ink-soft" htmlFor="pseudo">
              Ton pseudo
            </label>
            <input
              id="pseudo"
              className="clay-input"
              value={name}
              maxLength={24}
              placeholder="Mamie Ginette"
              autoComplete="nickname"
              onChange={(e) => setName(e.target.value)}
            />
            <button className="clay-btn w-full" disabled={busy || !name.trim()}>
              {busy ? "Un instant…" : "Jouer en invité"}
            </button>
          </form>
          <div className="my-4 flex items-center gap-3 text-sm font-semibold text-ink-soft">
            <span className="h-0.5 flex-1 rounded bg-ink/10" />
            ou
            <span className="h-0.5 flex-1 rounded bg-ink/10" />
          </div>
          <button
            type="button"
            className="clay-btn discord w-full"
            onClick={() => signInWithDiscord().catch((err) => setError((err as Error).message))}
          >
            <DiscordIcon /> Se connecter avec Discord
          </button>
          <p className="mt-3 text-center text-xs text-ink-soft">
            Discord est optionnel : il garde ton pseudo et ton avatar d&apos;une partie à l&apos;autre.
          </p>
        </>
      )}
      {error && <p className="mt-3 rounded-2xl bg-clay-red/15 p-3 text-center text-sm font-semibold text-clay-red">{error}</p>}
    </div>
  );
}
