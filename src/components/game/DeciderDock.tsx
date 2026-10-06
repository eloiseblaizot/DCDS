"use client";

import clsx from "clsx";
import { useState } from "react";
import { ClayCloud } from "@/components/art/ClayCloud";
import { ContainerArt } from "@/components/art/ContainerArt";
import { Modal } from "@/components/ui/Modal";
import type { RoomView } from "@/lib/client/roomView";
import { containerOf, jokerAvailability, participants, playerName } from "@/lib/game/selectors";
import { JOKER_ORDER, JOKERS } from "@/lib/game/settings";
import type { JokerKey, Player } from "@/lib/game/types";
import { Avatar } from "./PlayerTile";

/** Les jokers du décideur (nuages en pâte) + le bouton pour verrouiller son choix. */
export function DeciderDock({ view }: { view: RoomView }) {
  const s = view.state!;
  const avail = jokerAvailability(s, view.settings);
  const [open, setOpen] = useState<JokerKey | "lock" | null>(null);
  const keys = JOKER_ORDER.filter((k) => avail[k].enabled);

  return (
    <div className="clay clay-grain mx-auto w-full max-w-5xl p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-lg font-bold">👑 Tes jokers</p>
        <p className="text-sm text-ink-soft">Chaque joker sert une fois par manche. L&apos;urgence, une fois par partie.</p>
      </div>
      <div className="mt-2 flex flex-wrap justify-center gap-1 sm:gap-3">
        {keys.map((k) => {
          const ok = avail[k].available;
          return (
            <button
              key={k}
              type="button"
              disabled={!ok || view.pending}
              onClick={() => setOpen(k)}
              className={clsx(
                "group flex w-[4.75rem] shrink-0 flex-col items-center rounded-3xl p-1 transition sm:w-28",
                ok ? "hover:-translate-y-1 hover:bg-clay-blue/10" : "cursor-not-allowed opacity-45 grayscale",
              )}
            >
              <ClayCloud variant={k} className="h-14 w-[4.5rem] transition group-hover:scale-105 sm:h-20 sm:w-24" title={JOKERS[k].name} />
              <span className="text-sm font-bold">{JOKERS[k].short}</span>
              {!ok && <span className="text-[11px] font-semibold text-ink-soft">{s.action ? "en cours…" : "utilisé"}</span>}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex justify-center">
        <button className="clay-btn green lg" disabled={!!s.action || view.pending} onClick={() => setOpen("lock")}>
          🔒 Je garde mon conteneur
        </button>
      </div>
      {open && <JokerDialog view={view} joker={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function PlayerChoice({
  players,
  selected,
  onToggle,
  view,
}: {
  players: Player[];
  selected: string[];
  onToggle: (id: string) => void;
  view: RoomView;
}) {
  const s = view.state!;
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {players.map((p) => {
        const c = containerOf(s, p.id);
        const on = selected.includes(p.id);
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onToggle(p.id)}
            className={clsx(
              "flex items-center gap-2 rounded-2xl p-2 text-left transition",
              on ? "bg-clay-blue text-white shadow-[inset_0_-4px_0_rgba(0,0,0,.18)]" : "clay-sunken hover:brightness-95",
            )}
          >
            <Avatar id={p.id} name={p.name} avatar={p.avatar} className="h-9 w-9 shrink-0 text-sm" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold">{p.name}</span>
              {c && <span className="block text-xs opacity-80">Conteneur n°{c.id}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function JokerDialog({ view, joker, onClose }: { view: RoomView; joker: JokerKey | "lock"; onClose: () => void }) {
  const s = view.state!;
  const others = participants(s);
  const [picked, setPicked] = useState<string[]>([]);
  const [target, setTarget] = useState<number | null>(null);
  const max = joker === "switch" ? 2 : 1;

  const toggle = (id: string) =>
    setPicked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id].slice(-max)));

  const fire = async () => {
    let ok = false;
    if (joker === "lock") ok = await view.gameAction({ type: "lock" });
    if (joker === "emergency") ok = await view.gameAction({ type: "joker_emergency" });
    if (joker === "trust" && picked[0]) ok = await view.gameAction({ type: "joker_trust", viewerId: picked[0] });
    if (joker === "steal" && picked[0]) ok = await view.gameAction({ type: "steal", targetId: picked[0] });
    if (joker === "switch" && picked.length === 2) ok = await view.gameAction({ type: "joker_switch", a: picked[0], b: picked[1] });
    if (joker === "spy" && picked[0] && target !== null) {
      ok = await view.gameAction({ type: "joker_spy", spyId: picked[0], containerId: target });
    }
    if (ok) onClose();
  };

  const spyTargets =
    joker === "spy" && picked[0]
      ? s.containers.filter((c) => c.ownerId && c.ownerId !== picked[0] && c.ownerId !== s.deciderId)
      : [];

  const ready =
    joker === "lock" ||
    joker === "emergency" ||
    (joker === "switch" ? picked.length === 2 : joker === "spy" ? picked.length === 1 && target !== null : picked.length === 1);

  const title = joker === "lock" ? "Verrouiller ton choix ?" : JOKERS[joker].name;
  const cta: Record<typeof joker, string> = {
    lock: "🔒 Oui, je garde mon conteneur",
    trust: "🤝 Envoyer en confiance",
    switch: "🔄 Échanger leurs conteneurs",
    spy: "🔍 Envoyer l'espion",
    steal: "👑 Voler ce conteneur",
    emergency: "🚨 Invoquer le conteneur d'urgence",
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={title}
      icon={<ClayCloud variant={joker === "lock" ? "face" : joker} className="h-24 w-32" />}
    >
      <p className="text-ink-soft">
        {joker === "lock"
          ? "Tu gardes ton conteneur actuel et on passe directement au reveal. Pas de retour en arrière !"
          : JOKERS[joker].description}
      </p>
      {joker === "steal" && <p className="mt-1 text-sm font-semibold text-clay-red">Attention : le vol termine la manche.</p>}

      {(joker === "trust" || joker === "switch" || joker === "steal" || joker === "spy") && (
        <div className="mt-4">
          <p className="mb-2 text-sm font-bold">
            {joker === "switch"
              ? `Choisis deux participants (${picked.length}/2)`
              : joker === "spy"
                ? "1. Qui sera l'espion ?"
                : joker === "steal"
                  ? "À qui voles-tu le conteneur ?"
                  : "Qui va regarder ton conteneur ?"}
          </p>
          <PlayerChoice
            view={view}
            players={others}
            selected={picked}
            onToggle={(id) => {
              toggle(id);
              setTarget(null);
            }}
          />
        </div>
      )}

      {joker === "spy" && picked[0] && (
        <div className="mt-4">
          <p className="mb-2 text-sm font-bold">2. Quel conteneur {playerName(s, picked[0])} doit-il espionner ?</p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {spyTargets.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setTarget(c.id)}
                className={clsx("rounded-2xl p-1.5 text-center transition", target === c.id ? "bg-clay-blue text-white" : "clay-sunken")}
              >
                <ContainerArt color={c.color} number={c.id} className="w-full" />
                <span className="block truncate text-xs font-bold">{playerName(s, c.ownerId)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <button type="button" className="clay-btn light" onClick={onClose}>
          Annuler
        </button>
        <button
          type="button"
          className={clsx("clay-btn", joker === "steal" || joker === "emergency" ? "red" : joker === "lock" ? "green" : "")}
          disabled={!ready || view.pending}
          onClick={fire}
        >
          {cta[joker]}
        </button>
      </div>
    </Modal>
  );
}
