"use client";

import clsx from "clsx";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { isHost, type RoomView } from "@/lib/client/roomView";
import { containerOf, currentStep, eligibleDeciders } from "@/lib/game/selectors";
import type { GameState } from "@/lib/game/types";
import { Announcer } from "./Announcer";
import { BigScreen } from "./BigScreen";
import { ContainerSlot } from "./ContainerSlot";
import { DeciderDock } from "./DeciderDock";
import { CamStrip, GameOverStage, NominationStage, ResultsStage, RevealStage } from "./Stages";
import { TopBar } from "./TopBar";

/** Quand le temps de la manche est écoulé, n'importe quel client prévient le serveur. */
function useTimeoutWatcher(view: RoomView) {
  const deadline = view.state?.deadline;
  const phase = view.state?.phase;
  const { gameAction } = view;
  useEffect(() => {
    if (!deadline || (phase !== "picking" && phase !== "discovery" && phase !== "decider")) return;
    const jitter = 300 + Math.random() * 1500;
    let last = 0;
    const iv = setInterval(() => {
      const now = Date.now();
      if (now >= deadline + jitter && now - last > 4000) {
        last = now;
        void gameAction({ type: "timeout" }, { silent: true });
      }
    }, 1000);
    return () => clearInterval(iv);
  }, [deadline, phase, gameAction]);
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <p className="mx-auto w-fit rounded-full bg-white/90 px-5 py-2 text-center font-bold text-ink shadow-[0_4px_0_rgba(16,36,110,.2)]">
      {children}
    </p>
  );
}

function ActionBar({ view }: { view: RoomView }) {
  const s = view.state!;
  const me = view.me.id;
  const step = currentStep(s);
  const host = isHost(view);
  const isDecider = s.deciderId === me;
  const inGame = s.players.some((p) => p.id === me);

  if (step && step.viewerId === me) {
    const label = step.containerId === 99 ? "d'urgence" : `n°${step.containerId}`;
    return (
      <div className="flex justify-center">
        {!step.opened ? (
          <button className="clay-btn yellow lg animate-[wiggle_1.2s_ease-in-out_infinite]" disabled={view.pending} onClick={() => view.gameAction({ type: "open" })}>
            📦 Ouvrir le conteneur {label}
          </button>
        ) : (
          <button className="clay-btn green lg" disabled={view.pending} onClick={() => view.gameAction({ type: "done" })}>
            ✅ J&apos;ai fini, au suivant !
          </button>
        )}
      </div>
    );
  }

  switch (s.phase) {
    case "picking": {
      const mine = containerOf(s, me);
      const deciderPicked = !!containerOf(s, s.deciderId);
      return (
        <Hint>
          {!inGame
            ? "Les joueurs choisissent leur conteneur…"
            : mine
              ? `C'est noté : conteneur n°${mine.id}. On attend les autres…`
              : isDecider
                ? "👑 Choisis ton conteneur en premier !"
                : deciderPicked
                  ? "🏃 Vite, clique sur un conteneur libre !"
                  : "Patience, le décideur choisit en premier…"}
        </Hint>
      );
    }
    case "discovery":
      return (
        <Hint>
          Découverte {(step?.index ?? 0) + 1}/{step?.total ?? 1} ·{" "}
          {isDecider ? "Observe bien les réactions 👀" : "Seul celui qui ouvre voit le contenu"}
        </Hint>
      );
    case "decider":
      if (isDecider && !s.action) return <DeciderDock view={view} />;
      if (step) return <Hint>Joker en cours… {step.index + 1}/{step.total}</Hint>;
      return <Hint>Le décideur réfléchit à ses jokers… Bluffez bien 😏</Hint>;
    case "reveal":
      if (isDecider || host) {
        const more = s.revealed < s.revealOrder.length;
        return (
          <div className="flex justify-center">
            <button className="clay-btn yellow lg" disabled={view.pending} onClick={() => view.gameAction({ type: "reveal_next" })}>
              {more ? `✨ Révéler le conteneur suivant (${s.revealed + 1}/${s.revealOrder.length})` : "🏆 Voir les résultats"}
            </button>
          </div>
        );
      }
      return <Hint>Le décideur ouvre les conteneurs un par un…</Hint>;
    case "results":
      if (isDecider || host) {
        return (
          <div className="flex justify-center">
            <button className="clay-btn lg" disabled={view.pending} onClick={() => view.gameAction({ type: "next_round" })}>
              {eligibleDeciders(s).length ? "➡️ Manche suivante" : "🏁 Classement final"}
            </button>
          </div>
        );
      }
      return <Hint>En attente de la manche suivante…</Hint>;
    case "game_over":
      return (
        <div className="flex flex-wrap justify-center gap-3">
          {host ? (
            <button className="clay-btn yellow lg" onClick={() => view.roomAction({ type: "back_to_lobby" })}>
              🔁 Rejouer (retour au salon)
            </button>
          ) : (
            <Hint>Merci d&apos;avoir joué ! L&apos;host peut relancer une partie.</Hint>
          )}
          <Link href="/" className="clay-btn light lg">
            🏠 Accueil
          </Link>
        </div>
      );
    default:
      return null;
  }
}

function ContainersRow({ view }: { view: RoomView }) {
  const s = view.state!;
  const me = view.me.id;
  const inGame = s.players.some((p) => p.id === me);
  const mine = containerOf(s, me);
  const deciderPicked = !!containerOf(s, s.deciderId);
  const canPick = s.phase === "picking" && inGame && !mine && (s.deciderId === me || deciderPicked);
  const step = currentStep(s);

  return (
    <section className="rounded-[32px] bg-white/15 p-3 sm:p-5">
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-4 sm:gap-x-5">
        {s.containers.map((c) => (
          <ContainerSlot
            key={c.id}
            view={view}
            container={c}
            pickable={canPick && !c.ownerId && !c.emergency && !c.discarded}
            onPick={() => view.gameAction({ type: "pick", containerId: c.id })}
            active={step?.containerId === c.id}
          />
        ))}
      </div>
    </section>
  );
}

function EventLog({ state }: { state: GameState }) {
  const entries = state.log.slice(-8).reverse();
  return (
    <div className="clay p-4">
      <p className="mb-2 text-sm font-bold text-ink-soft">📜 Journal</p>
      <ul className="space-y-1 text-sm">
        {entries.map((e, i) => (
          <li key={e.id} className={clsx("leading-snug", i > 0 && "text-ink/70")}>
            {e.text}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ErrorToast({ view }: { view: RoomView }) {
  const { error, clearError } = view;
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(clearError, 4500);
    return () => clearTimeout(t);
  }, [error, clearError]);
  return (
    <AnimatePresence>
      {error && (
        <motion.button
          type="button"
          onClick={clearError}
          className="fixed bottom-5 left-1/2 z-50 max-w-[90vw] -translate-x-1/2 rounded-full bg-clay-red px-5 py-3 font-bold text-white shadow-[0_6px_0_#b3141c,0_16px_30px_-10px_rgba(0,0,0,.5)]"
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
        >
          {error}
        </motion.button>
      )}
    </AnimatePresence>
  );
}

export function GameScreen({ view }: { view: RoomView }) {
  const s = view.state!;
  const [chatOpen, setChatOpen] = useState(false);
  useTimeoutWatcher(view);
  const spectator = !s.players.some((p) => p.id === view.me.id);
  const showContainers = s.phase === "picking" || s.phase === "discovery" || s.phase === "decider" || s.phase === "reveal";

  let stage: React.ReactNode;
  switch (s.phase) {
    case "nomination":
      stage = <NominationStage view={view} />;
      break;
    case "reveal":
      stage = <RevealStage view={view} />;
      break;
    case "results":
      stage = <ResultsStage view={view} />;
      break;
    case "game_over":
      stage = <GameOverStage view={view} />;
      break;
    default:
      stage = <BigScreen view={view} />;
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-[1600px] flex-col gap-3 p-2 sm:p-4">
      <TopBar view={view} />
      <div className="flex min-h-0 flex-1 gap-4">
        <main className="flex min-w-0 flex-1 flex-col gap-4 pb-24 lg:pb-6">
          {spectator && <p className="mx-auto pill bg-white/90 text-ink">👀 Tu regardes la partie en spectateur</p>}
          <div className={clsx(s.phase === "nomination" && "pt-16 sm:pt-20")}>{stage}</div>
          <ActionBar view={view} />
          {showContainers && <ContainersRow view={view} />}
          {s.phase === "reveal" && <CamStrip view={view} />}
        </main>
        <aside className="sticky top-4 hidden h-[calc(100dvh-7rem)] w-80 shrink-0 flex-col gap-3 lg:flex">
          <ChatPanel view={view} className="min-h-0 flex-1" />
          <EventLog state={s} />
        </aside>
      </div>

      <button
        type="button"
        className="clay-btn pink fixed bottom-4 right-4 z-30 lg:hidden"
        onClick={() => setChatOpen(true)}
        aria-label="Ouvrir le chat"
      >
        💬 Chat
      </button>
      <AnimatePresence>
        {chatOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end bg-[#0b1640]/40 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setChatOpen(false)}
          >
            <motion.div
              className="h-[75dvh] w-full p-2"
              initial={{ y: 80 }}
              animate={{ y: 0 }}
              exit={{ y: 80 }}
              onClick={(e) => e.stopPropagation()}
            >
              <ChatPanel view={view} className="h-full" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Announcer state={s} />
      <ErrorToast view={view} />
    </div>
  );
}
