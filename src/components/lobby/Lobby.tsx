"use client";

import clsx from "clsx";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { Logo } from "@/components/art/Logo";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { Footer } from "@/components/Footer";
import { ErrorToast } from "@/components/game/GameScreen";
import { PlayerTile } from "@/components/game/PlayerTile";
import { MediaToggles } from "@/components/game/TopBar";
import { isHost, type RoomView } from "@/lib/client/roomView";
import { MIN_PLAYERS } from "@/lib/game/settings";
import { SettingsPanel } from "./SettingsPanel";

function InviteBox({ code, demo }: { code: string; demo: boolean }) {
  const [copied, setCopied] = useState(false);
  const canShare = useSyncExternalStore(
    () => () => {},
    () => "share" in navigator,
    () => false,
  );
  const url = typeof window !== "undefined" ? `${window.location.origin}/r/${code}` : `/r/${code}`;
  const copy = async () => {
    await navigator.clipboard.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  const share = () => navigator.share?.({ title: "DCDS", text: "Viens jouer à DCDS avec moi !", url }).catch(() => {});

  return (
    <div className="clay flex flex-wrap items-center gap-3 px-4 py-3">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-ink-soft">Code du salon</p>
        <p className="font-mono text-3xl font-bold tracking-[0.2em]">{code}</p>
      </div>
      {!demo && (
        <div className="flex flex-wrap gap-2">
          <button type="button" className="clay-btn sm" onClick={copy}>
            {copied ? "✅ Lien copié !" : "🔗 Copier le lien d'invitation"}
          </button>
          {canShare && (
            <button type="button" className="clay-btn sm pink" onClick={share}>
              📤 Partager
            </button>
          )}
        </div>
      )}
      {!demo && <p className="w-full text-xs text-ink-soft">Colle le lien dans ton serveur Discord : tes amis rejoignent en un clic.</p>}
    </div>
  );
}

export function Lobby({ view }: { view: RoomView }) {
  const router = useRouter();
  const host = isHost(view);
  const players = view.members.filter((m) => m.role === "player");
  const spectators = view.members.filter((m) => m.role === "spectator");
  const me = view.members.find((m) => m.id === view.me.id);
  const max = view.settings.maxPlayers;
  const hostName = view.members.find((m) => m.id === view.hostId)?.name ?? "l'host";
  const tooFew = players.length < MIN_PLAYERS;
  const tooMany = players.length > max;

  const leave = async () => {
    await view.leave();
    router.push("/");
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-6xl flex-col gap-4 p-3 sm:p-6">
      <header className="flex flex-wrap items-center gap-3">
        <Link href="/" aria-label="Accueil">
          <Logo size="md" />
        </Link>
        <div className="ml-auto">
          <InviteBox code={view.code} demo={view.mode === "demo"} />
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <div className="flex min-w-0 flex-col gap-4">
          <section className="clay clay-grain p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-2xl font-bold">
                Joueurs <span className={clsx(tooMany && "text-clay-red")}>{players.length}/{max}</span>
              </h2>
              <MediaToggles />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {players.map((m) => (
                <div key={m.id} className="group relative">
                  <PlayerTile
                    id={m.id}
                    name={m.id === view.me.id ? `${m.name} (toi)` : m.name}
                    avatar={m.avatar}
                    dim={!m.online}
                    className="aspect-video w-full"
                    badge={
                      m.id === view.hostId ? (
                        <span className="pill bg-clay-yellow text-[#5b4b00]">⭐ Host</span>
                      ) : !m.online ? (
                        <span className="pill bg-ink/70 text-white">hors ligne</span>
                      ) : undefined
                    }
                  />
                  {host && m.id !== view.me.id && (
                    <div className="absolute left-1.5 top-1.5 flex gap-1 opacity-0 transition group-hover:opacity-100">
                      <button
                        type="button"
                        className="rounded-full bg-white/95 px-2 py-0.5 text-xs font-bold text-clay-red shadow"
                        onClick={() => confirm(`Expulser ${m.name} ?`) && view.roomAction({ type: "kick", userId: m.id })}
                      >
                        Expulser
                      </button>
                      {view.mode === "online" && (
                        <button
                          type="button"
                          className="rounded-full bg-white/95 px-2 py-0.5 text-xs font-bold text-ink shadow"
                          onClick={() => confirm(`Donner le rôle d'host à ${m.name} ?`) && view.roomAction({ type: "transfer_host", userId: m.id })}
                        >
                          ⭐ Host
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {Array.from({ length: Math.max(0, max - players.length) }, (_, i) => (
                <div
                  key={`empty-${i}`}
                  className="flex aspect-video items-center justify-center rounded-[20px] border-4 border-dashed border-ink/15 text-sm font-bold text-ink/35"
                >
                  Place libre
                </div>
              ))}
            </div>
            {spectators.length > 0 && (
              <p className="mt-4 text-sm text-ink-soft">
                👀 Spectateurs : <span className="font-semibold text-ink">{spectators.map((s) => s.name).join(", ")}</span>
              </p>
            )}
            {view.mode === "online" && me && (
              <div className="mt-4 flex flex-wrap gap-2">
                {me.role === "player" ? (
                  <button type="button" className="clay-btn sm light" onClick={() => view.roomAction({ type: "set_role", role: "spectator" })}>
                    👀 Je regarde seulement
                  </button>
                ) : (
                  <button
                    type="button"
                    className="clay-btn sm"
                    disabled={players.length >= max}
                    onClick={() => view.roomAction({ type: "set_role", role: "player" })}
                  >
                    🎮 Je veux jouer
                  </button>
                )}
                <button type="button" className="clay-btn sm light" onClick={leave}>
                  🚪 Quitter le salon
                </button>
              </div>
            )}
          </section>

          <section className="clay p-5 text-center">
            {host ? (
              <>
                <button
                  type="button"
                  className="clay-btn yellow lg"
                  disabled={tooFew || tooMany || view.pending}
                  onClick={() => view.roomAction({ type: "start" })}
                >
                  🚀 Lancer la partie
                </button>
                <p className="mt-2 text-sm text-ink-soft">
                  {tooFew
                    ? `Il faut au moins ${MIN_PLAYERS} joueurs (4 ou plus, c'est mieux !).`
                    : tooMany
                      ? "Trop de joueurs pour la limite choisie."
                      : `${players.length} manches : chaque joueur sera décideur une fois.`}
                </p>
              </>
            ) : (
              <p className="font-bold text-ink-soft">⏳ En attente du lancement par {hostName}…</p>
            )}
          </section>

          <ChatPanel view={view} className="h-80" />
        </div>

        <SettingsPanel view={view} />
      </div>
      <Footer />
      <ErrorToast view={view} />
    </div>
  );
}
