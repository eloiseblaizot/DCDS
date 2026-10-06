"use client";

import { AnimatePresence, motion } from "motion/react";
import type { RoomView } from "@/lib/client/roomView";
import { containerById, containerOf, currentStep, playerById, playerName, spotlightId } from "@/lib/game/selectors";
import { LotCard } from "./LotCard";
import { PlayerTile } from "./PlayerTile";

function caption(view: RoomView): string {
  const s = view.state!;
  const step = currentStep(s);
  const me = view.me.id;
  const you = (id: string | null | undefined) => (id === me ? "Tu" : playerName(s, id));

  if (s.phase === "picking") {
    return containerOf(s, s.deciderId)
      ? "À vous ! Premier arrivé, premier servi 🏃"
      : `👑 ${playerName(s, s.deciderId)} choisit son conteneur en premier…`;
  }
  if (step) {
    const target = containerById(s, step.containerId);
    switch (step.kind) {
      case "discovery":
        return step.viewerId === me
          ? step.opened
            ? "Tout le monde regarde ta réaction… 🎥"
            : "À toi ! Ouvre ton conteneur, tout le monde voit ta réaction"
          : `${playerName(s, step.viewerId)} découvre son conteneur 🤫`;
      case "spy":
        return `🔍 ${you(step.viewerId)} espionne le conteneur de ${playerName(s, target?.ownerId)}`;
      case "switch":
        return `🔄 ${you(step.viewerId)} découvre son nouveau conteneur`;
      case "trust":
        return `🤝 ${you(step.viewerId)} regarde le conteneur du décideur`;
    }
  }
  if (s.phase === "decider") {
    return s.deciderId === me ? "👑 À toi de jouer, décideur !" : `👑 ${playerName(s, s.deciderId)} réfléchit…`;
  }
  return "";
}

/** L'écran géant : la réaction du joueur en cours, en grand. */
export function BigScreen({ view }: { view: RoomView }) {
  const s = view.state!;
  const step = currentStep(s);
  const spot = playerById(s, spotlightId(s));
  const iAmViewer = step?.viewerId === view.me.id;
  const myLot = iAmViewer && step?.opened ? view.knowledge.find((k) => k.containerId === step.containerId)?.lot : undefined;
  const text = caption(view);

  return (
    <div className="mx-auto w-full max-w-[min(100%,calc(50dvh*16/9))]">
      <div className="relative aspect-video overflow-hidden rounded-[34px] border-[8px] border-white bg-[#0f1d4d] shadow-[0_24px_50px_-18px_rgba(11,22,64,.8),inset_0_0_0_3px_rgba(16,36,110,.15)] sm:border-[12px]">
        <AnimatePresence mode="wait">
          {spot ? (
            <motion.div
              key={spot.id}
              className="absolute inset-0"
              initial={{ opacity: 0, scale: 1.04 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
            >
              <PlayerTile id={spot.id} name={spot.name} avatar={spot.avatar} label={false} rounded="rounded-none" className="h-full w-full" />
            </motion.div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-6xl">📺</div>
          )}
        </AnimatePresence>

        <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2 sm:left-5 sm:top-5">
          <span className="pill bg-clay-red text-white shadow">
            <span className="h-2 w-2 animate-pulse rounded-full bg-white" /> EN DIRECT
          </span>
          {spot && <span className="pill bg-white/90 text-ink shadow">{spot.name}</span>}
        </div>

        {text && (
          <div className="pointer-events-none absolute inset-x-3 bottom-3 flex justify-center sm:bottom-5">
            <span className="rounded-full bg-white/92 px-4 py-1.5 text-center text-sm font-bold text-ink shadow-[0_4px_0_rgba(16,36,110,.25)] sm:text-lg">
              {text}
            </span>
          </div>
        )}

        <AnimatePresence>
          {myLot && (
            <motion.div
              className="absolute right-3 top-1/2 -translate-y-1/2 origin-right scale-[0.62] sm:right-6 sm:scale-90 lg:scale-100"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <LotCard lot={myLot} size="md" />
              <p className="mt-2 text-center text-xs font-bold text-white drop-shadow">Toi seul(e) le vois 🤫</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
