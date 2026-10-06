"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { ClayCloud, type CloudVariant } from "@/components/art/ClayCloud";
import type { GameState, LogKind } from "@/lib/game/types";

const ANNOUNCED: Partial<Record<LogKind, CloudVariant>> = {
  decider: "steal",
  spy: "spy",
  switch: "switch",
  trust: "trust",
  emergency: "emergency",
  steal: "steal",
  lock: "face",
  timeout: "emergency",
};

/** Grosse annonce animée quand un joker est joué ou qu'un décideur est désigné. */
export function Announcer({ state }: { state: GameState }) {
  const last = state.log.at(-1);
  const [dismissed, setDismissed] = useState(() => last?.id ?? 0);
  const current = last && last.id > dismissed && ANNOUNCED[last.kind] ? last : null;

  useEffect(() => {
    if (!current) return;
    const t = setTimeout(() => setDismissed(current.id), 2600);
    return () => clearTimeout(t);
  }, [current]);

  return (
    <AnimatePresence>
      {current && (
        <motion.div
          key={current.id}
          className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="clay clay-grain flex max-w-xl flex-col items-center px-8 pb-6 pt-2 text-center"
            initial={{ scale: 0.3, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0.6, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 14 }}
          >
            <ClayCloud variant={ANNOUNCED[current.kind]} className="-mt-10 h-36 w-48" />
            <p className="text-2xl font-bold sm:text-3xl">{current.text}</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
