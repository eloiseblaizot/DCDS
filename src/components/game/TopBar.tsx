"use client";

import clsx from "clsx";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/art/Logo";
import { useMedia } from "@/components/media/MediaContext";
import { isHost, type RoomView } from "@/lib/client/roomView";
import { PHASE_LABELS, playerName } from "@/lib/game/selectors";

function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const iv = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(iv);
  }, [active]);
  return now;
}

export function Countdown({ deadline }: { deadline: number }) {
  const now = useNow(true);
  const left = Math.max(0, deadline - now);
  const m = Math.floor(left / 60_000);
  const sec = Math.floor((left % 60_000) / 1000);
  return (
    <span
      className={clsx("pill tabular-nums", left < 30_000 ? "animate-pulse bg-clay-red text-white" : "bg-white text-ink shadow")}
      title="Temps restant dans la manche"
    >
      ⏱ {m}:{sec.toString().padStart(2, "0")}
    </span>
  );
}

export function MediaToggles() {
  const media = useMedia();
  if (!media.local?.canPublish) {
    return media.error ? (
      <span className="pill bg-clay-red/15 text-clay-red" title={media.error}>
        ⚠️ Vidéo
      </span>
    ) : null;
  }
  return (
    <div className="flex gap-1.5">
      {media.videoEnabled && (
        <button
          type="button"
          className={clsx("clay-btn sm", media.local.camOn ? "light" : "red")}
          onClick={media.local.toggleCam}
          title={media.local.camOn ? "Couper la caméra" : "Activer la caméra"}
        >
          {media.local.camOn ? "📷" : "🚫📷"}
        </button>
      )}
      {media.audioEnabled && (
        <button
          type="button"
          className={clsx("clay-btn sm", media.local.micOn ? "light" : "red")}
          onClick={media.local.toggleMic}
          title={media.local.micOn ? "Couper le micro" : "Activer le micro"}
        >
          {media.local.micOn ? "🎙️" : "🔇"}
        </button>
      )}
    </div>
  );
}

export function TopBar({ view }: { view: RoomView }) {
  const s = view.state!;
  const router = useRouter();
  const [menu, setMenu] = useState(false);
  const host = isHost(view);

  const quit = async () => {
    if (!confirm("Quitter la partie ?")) return;
    await view.leave();
    router.push("/");
  };

  return (
    <header className="clay relative z-30 flex flex-wrap items-center gap-2 px-3 py-2 sm:px-4">
      <Link href="/" aria-label="Accueil" className="mr-1">
        <Logo size="sm" />
      </Link>
      {s.phase !== "game_over" && (
        <span className="pill bg-clay-blue text-white">
          Manche {s.round}/{s.totalRounds}
        </span>
      )}
      <span className="pill bg-ink/8 text-ink">{PHASE_LABELS[s.phase]}</span>
      {s.deciderId && s.phase !== "game_over" && (
        <span className="pill bg-clay-yellow text-[#5b4b00]">👑 {playerName(s, s.deciderId)}</span>
      )}
      {s.deadline && <Countdown deadline={s.deadline} />}

      <div className="ml-auto flex items-center gap-2">
        <MediaToggles />
        <span className="pill hidden bg-ink/8 font-mono text-ink-soft sm:inline-flex" title="Code du salon">
          {view.code}
        </span>
        <div className="relative">
          <button type="button" className="clay-btn sm light" onClick={() => setMenu((m) => !m)} aria-expanded={menu}>
            ☰
          </button>
          {menu && (
            <div className="clay absolute right-0 top-12 z-40 flex w-60 flex-col gap-1 p-2" onMouseLeave={() => setMenu(false)}>
              {host && s.phase !== "game_over" && (
                <button
                  type="button"
                  className="rounded-2xl px-3 py-2 text-left text-sm font-bold hover:bg-ink/6"
                  onClick={() => {
                    setMenu(false);
                    void view.gameAction({ type: "skip" });
                  }}
                >
                  ⏭️ Forcer la suite <span className="block text-xs font-normal text-ink-soft">si quelqu&apos;un est bloqué / AFK</span>
                </button>
              )}
              {host && (
                <button
                  type="button"
                  className="rounded-2xl px-3 py-2 text-left text-sm font-bold hover:bg-ink/6"
                  onClick={() => {
                    setMenu(false);
                    if (confirm("Arrêter la partie et revenir au salon ?")) void view.roomAction({ type: "back_to_lobby" });
                  }}
                >
                  🏠 Retour au salon
                </button>
              )}
              <Link href="/regles" target="_blank" className="rounded-2xl px-3 py-2 text-sm font-bold hover:bg-ink/6">
                📖 Règles
              </Link>
              {view.mode === "online" && (
                <button type="button" className="rounded-2xl px-3 py-2 text-left text-sm font-bold text-clay-red hover:bg-ink/6" onClick={quit}>
                  🚪 Quitter
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
