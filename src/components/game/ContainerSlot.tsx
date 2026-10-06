"use client";

import clsx from "clsx";
import { motion } from "motion/react";
import { ContainerArt } from "@/components/art/ContainerArt";
import type { RoomView } from "@/lib/client/roomView";
import { playerById } from "@/lib/game/selectors";
import type { ContainerPub } from "@/lib/game/types";
import { LotCard } from "./LotCard";
import { Avatar, PlayerTile } from "./PlayerTile";

export function ContainerSlot({
  view,
  container,
  onPick,
  pickable = false,
  active = false,
  showOwner = true,
}: {
  view: RoomView;
  container: ContainerPub;
  onPick?: () => void;
  pickable?: boolean;
  active?: boolean;
  showOwner?: boolean;
}) {
  const s = view.state!;
  const owner = playerById(s, container.ownerId);
  const mine = container.ownerId === view.me.id;
  const known = view.knowledge.find((k) => k.containerId === container.id);
  const isDeciders = !!owner && owner.id === s.deciderId;
  const label = container.emergency ? "SOS" : container.id;

  return (
    <motion.div layout className="flex w-[8.5rem] flex-col items-center gap-1.5 sm:w-[9.5rem]">
      <div className="flex h-6 items-center gap-1 text-xs font-bold text-white drop-shadow">
        {isDeciders && <span className="pill bg-clay-yellow text-[#5b4b00]">👑 Décideur</span>}
        {mine && !isDeciders && <span className="pill bg-white text-ink">À toi</span>}
        {container.discarded && <span className="pill bg-ink/70 text-white">Abandonné</span>}
        {container.emergency && <span className="pill bg-clay-red text-white">🚨 Urgence</span>}
      </div>

      <button
        type="button"
        disabled={!pickable}
        onClick={onPick}
        aria-label={`Conteneur ${label}${owner ? ` de ${owner.name}` : container.discarded ? " abandonné" : " libre"}`}
        className={clsx(
          "group relative w-full rounded-3xl transition-transform duration-150",
          pickable && "cursor-pointer hover:-translate-y-1.5 hover:rotate-[-1.5deg]",
          !pickable && "cursor-default",
          active && "animate-[wiggle_0.9s_ease-in-out_infinite]",
        )}
      >
        <ContainerArt
          color={container.color}
          number={label}
          emergency={container.emergency}
          discarded={container.discarded}
          className={clsx(
            "w-full drop-shadow-[0_8px_10px_rgba(16,36,110,.35)]",
            mine && "drop-shadow-[0_0_10px_rgba(255,255,255,.95)]",
          )}
        />
        {pickable && (
          <span className="absolute inset-x-0 -bottom-1 mx-auto w-fit rounded-full bg-white px-3 py-0.5 text-xs font-bold text-ink shadow opacity-0 transition group-hover:opacity-100">
            Je le prends !
          </span>
        )}
        {container.lot && (
          <div className="absolute inset-0 flex items-center justify-center">
            <LotCard lot={container.lot} size="sm" />
          </div>
        )}
        {!container.lot && known && (
          <span
            className="absolute -right-2 -top-2 flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-sm font-bold text-ink shadow-[0_3px_0_rgba(16,36,110,.2)]"
            title={`Tu as vu : ${known.lot.name}`}
          >
            👁 <span className="text-lg leading-none">{known.lot.emoji}</span>
          </span>
        )}
      </button>

      {showOwner &&
        (owner ? (
          <PlayerTile id={owner.id} name={owner.name} avatar={owner.avatar} className="aspect-video w-full" />
        ) : container.discarded ? null : (
          <div className="clay-sunken flex aspect-video w-full items-center justify-center text-xs font-bold text-ink-soft">
            Libre
          </div>
        ))}

      {container.seenBy.length > 0 && !container.lot && (
        <div className="flex items-center gap-1 rounded-full bg-white/85 px-2 py-0.5 text-[11px] font-bold text-ink-soft shadow">
          <span>Vu par</span>
          <span className="flex -space-x-1.5">
            {container.seenBy.map((id) => {
              const p = playerById(s, id);
              return p ? (
                <span key={id} title={p.name}>
                  <Avatar id={p.id} name={p.name} avatar={p.avatar} className="h-5 w-5 text-[10px] ring-2 ring-white" />
                </span>
              ) : null;
            })}
          </span>
        </div>
      )}
    </motion.div>
  );
}
