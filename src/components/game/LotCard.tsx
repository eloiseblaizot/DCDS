"use client";

import clsx from "clsx";
import { motion } from "motion/react";
import { formatValue, TIERS } from "@/lib/game/lots";
import type { Lot } from "@/lib/game/types";

/** Carte d'un lot, avec son emoji en relief et son badge de rareté. */
export function LotCard({
  lot,
  size = "md",
  className,
  animate = true,
}: {
  lot: Lot;
  size?: "sm" | "md" | "lg";
  className?: string;
  animate?: boolean;
}) {
  const tier = TIERS[lot.tier];
  const legendary = lot.tier === "legendaire";
  return (
    <motion.div
      initial={animate ? { scale: 0.4, rotate: -8, opacity: 0 } : false}
      animate={{ scale: 1, rotate: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 16 }}
      className={clsx(
        "clay clay-grain relative flex flex-col items-center text-center",
        size === "lg" && "w-72 p-6",
        size === "md" && "w-52 p-4",
        size === "sm" && "w-32 rounded-[20px] p-2.5",
        className,
      )}
      style={legendary ? { boxShadow: "0 0 0 4px #ffe814, 0 0 40px 6px rgba(255,232,20,.55), 0 16px 32px -14px rgba(16,36,110,.55)" } : undefined}
    >
      <div
        className={clsx(
          "flex items-center justify-center rounded-full",
          size === "lg" ? "h-36 w-36 text-[5.5rem]" : size === "md" ? "h-24 w-24 text-6xl" : "h-14 w-14 text-4xl",
        )}
        style={{
          background: `radial-gradient(circle at 35% 30%, #ffffff, ${tier.color}55 70%)`,
          filter: "drop-shadow(0 6px 6px rgba(16,36,110,.25))",
        }}
      >
        <span aria-hidden>{lot.emoji}</span>
      </div>
      <p className={clsx("mt-2 font-bold leading-tight", size === "sm" ? "text-xs" : size === "md" ? "text-base" : "text-xl")}>
        {lot.name}
      </p>
      <div className={clsx("mt-1.5 flex flex-wrap items-center justify-center gap-1", size === "sm" && "scale-90")}>
        <span className="pill" style={{ background: tier.color, color: tier.ink }}>
          {tier.label}
        </span>
        {size !== "sm" && <span className="pill bg-ink/8 text-ink-soft">{formatValue(lot.value)}</span>}
      </div>
    </motion.div>
  );
}
