"use client";

import clsx from "clsx";
import { AnimatePresence, motion } from "motion/react";
import { ClayCloud } from "@/components/art/ClayCloud";
import { isHost, type RoomView } from "@/lib/client/roomView";
import { formatValue, TIERS } from "@/lib/game/lots";
import { containerById, eligibleDeciders, playerById, playerName, ranking } from "@/lib/game/selectors";
import { LotCard } from "./LotCard";
import { Avatar, PlayerTile } from "./PlayerTile";

export function NominationStage({ view }: { view: RoomView }) {
  const s = view.state!;
  const eligible = eligibleDeciders(s);
  const canVolunteer = eligible.some((p) => p.id === view.me.id);
  return (
    <div className="clay clay-grain mx-auto w-full max-w-4xl p-5 text-center sm:p-8">
      <div className="-mt-16 mb-1 flex justify-center sm:-mt-20">
        <ClayCloud variant="steal" className="h-28 w-36 animate-float sm:h-32 sm:w-44" />
      </div>
      <p className="font-bold text-ink-soft">
        Manche {s.round} sur {s.totalRounds}
      </p>
      <h2 className="text-3xl font-bold sm:text-4xl">Qui sera le décideur ?</h2>
      <p className="mx-auto mt-2 max-w-xl text-ink-soft">
        Le décideur ne voit pas son conteneur. Il observe les réactions des autres, utilise ses jokers… et peut voler le
        meilleur lot.
      </p>
      <div className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
        {s.players.map((p) => {
          const past = s.pastDeciders.includes(p.id);
          return (
            <PlayerTile
              key={p.id}
              id={p.id}
              name={p.name}
              avatar={p.avatar}
              dim={past}
              className="aspect-square w-full"
              badge={past ? <span className="pill bg-clay-yellow text-[#5b4b00]">👑 déjà</span> : undefined}
            />
          );
        })}
      </div>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {canVolunteer && (
          <button className="clay-btn yellow lg" disabled={view.pending} onClick={() => view.gameAction({ type: "volunteer" })}>
            🙋 Je me porte volontaire
          </button>
        )}
        {isHost(view) && (
          <button className="clay-btn lg" disabled={view.pending} onClick={() => view.gameAction({ type: "draw_decider" })}>
            🎲 Tirage au sort
          </button>
        )}
      </div>
      {!isHost(view) && (
        <p className="mt-4 text-sm font-semibold text-ink-soft">
          {canVolunteer ? "Ou attends le tirage au sort lancé par l'host." : "En attente d'un volontaire ou du tirage au sort…"}
        </p>
      )}
      <p className="mt-2 text-xs text-ink-soft">Encore {eligible.length} décideur(s) à passer.</p>
    </div>
  );
}

export function RevealStage({ view }: { view: RoomView }) {
  const s = view.state!;
  const lastId = s.revealed > 0 ? s.revealOrder[s.revealed - 1] : null;
  const c = lastId !== null ? containerById(s, lastId) : undefined;
  const owner = playerById(s, c?.ownerId);
  const reason =
    s.endReason === "steal"
      ? `👑 ${playerName(s, s.deciderId)} a volé un conteneur !`
      : s.endReason === "timeout"
        ? "⏰ Temps écoulé !"
        : `🔒 ${playerName(s, s.deciderId)} a gardé son conteneur.`;

  return (
    <div className="clay clay-grain mx-auto w-full max-w-5xl p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-2xl font-bold sm:text-3xl">Le grand reveal ✨</h2>
        <span className="pill bg-ink/8 text-ink-soft">{reason}</span>
      </div>
      <div className="mt-5 grid min-h-72 items-center gap-5 sm:grid-cols-2 xl:grid-cols-[1fr_auto_1fr]">
        <AnimatePresence mode="wait">
          {c && c.lot ? (
            <motion.div key={`o${c.id}`} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
              {owner ? (
                <PlayerTile id={owner.id} name={owner.name} avatar={owner.avatar} className="aspect-video w-full" />
              ) : (
                <div className="clay-sunken flex aspect-video items-center justify-center p-4 text-center font-bold text-ink-soft">
                  Personne… c&apos;est le conteneur abandonné !
                </div>
              )}
            </motion.div>
          ) : (
            <div />
          )}
        </AnimatePresence>
        <div className="flex justify-center">
          <AnimatePresence mode="wait">
            {c?.lot ? (
              <motion.div key={c.id} initial={{ rotateY: 90 }} animate={{ rotateY: 0 }} exit={{ opacity: 0, scale: 0.8 }}>
                <LotCard lot={c.lot} size="lg" />
              </motion.div>
            ) : (
              <motion.div key="wait" className="text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <ClayCloud variant="face" className="mx-auto h-32 w-44 animate-float" />
                <p className="mt-2 text-lg font-bold">Tout le monde est prêt ?</p>
                <p className="text-sm text-ink-soft">On ouvre les conteneurs un par un, le décideur en dernier.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="text-center sm:col-span-2 xl:col-span-1 xl:text-left">
          {c?.lot && (
            <motion.div key={`t${c.id}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <p className="text-sm font-bold text-ink-soft">
                Conteneur {c.emergency ? "d'urgence" : `n°${c.id}`}
                {c.discarded ? " (abandonné)" : ""}
              </p>
              <p className="text-2xl font-bold">
                {c.discarded ? "Ce qu'il y avait dedans…" : owner?.id === s.deciderId ? `👑 ${owner?.name}` : owner?.name}
              </p>
              <p className="mt-1 text-lg font-bold" style={{ color: TIERS[c.lot.tier].ink === "#ffffff" ? TIERS[c.lot.tier].color : TIERS[c.lot.tier].ink }}>
                {TIERS[c.lot.tier].label} · {formatValue(c.lot.value)}
              </p>
            </motion.div>
          )}
        </div>
      </div>
      <div className="mt-5 flex justify-center gap-2">
        {s.revealOrder.map((cid, i) => {
          const cc = containerById(s, cid);
          return (
            <span
              key={cid}
              className={clsx("h-3 w-8 rounded-full transition", i < s.revealed ? "" : "opacity-30")}
              style={{ background: cc?.color ?? "#ccc" }}
            />
          );
        })}
      </div>
    </div>
  );
}

const MEDALS = ["🥇", "🥈", "🥉"];

export function ResultsStage({ view }: { view: RoomView }) {
  const s = view.state!;
  const r = s.history.at(-1);
  const entries = [...(r?.entries ?? [])].sort((a, b) => b.lot.value - a.lot.value);
  return (
    <div className="mx-auto grid w-full max-w-5xl gap-4 lg:grid-cols-[1.4fr_1fr]">
      <div className="clay clay-grain p-5 sm:p-7">
        <h2 className="text-2xl font-bold sm:text-3xl">Résultats de la manche {s.round}</h2>
        <ol className="mt-4 space-y-2">
          {entries.map((e, i) => {
            const p = playerById(s, e.playerId);
            if (!p) return null;
            return (
              <motion.li
                key={e.playerId}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className="clay-sunken flex items-center gap-3 p-2.5"
              >
                <span className="w-7 text-center text-xl">{MEDALS[i] ?? `${i + 1}.`}</span>
                <Avatar id={p.id} name={p.name} avatar={p.avatar} className="h-9 w-9 text-sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold">
                    {p.id === r?.deciderId && "👑 "}
                    {p.name}
                  </span>
                  <span className="block truncate text-sm text-ink-soft">
                    {e.lot.emoji} {e.lot.name}
                  </span>
                </span>
                <span className="pill" style={{ background: TIERS[e.lot.tier].color, color: TIERS[e.lot.tier].ink }}>
                  {formatValue(e.lot.value)}
                </span>
              </motion.li>
            );
          })}
        </ol>
      </div>
      <Scoreboard view={view} />
    </div>
  );
}

export function Scoreboard({ view, title = "Classement général" }: { view: RoomView; title?: string }) {
  const s = view.state!;
  return (
    <div className="clay clay-grain p-5 sm:p-7">
      <h3 className="text-xl font-bold">{title}</h3>
      <ol className="mt-3 space-y-1.5">
        {ranking(s).map(({ player, score }, i) => (
          <li key={player.id} className="flex items-center gap-2.5">
            <span className="w-6 text-center font-bold text-ink-soft">{i + 1}</span>
            <Avatar id={player.id} name={player.name} avatar={player.avatar} className="h-8 w-8 text-sm" />
            <span className={clsx("flex-1 truncate font-semibold", player.id === view.me.id && "text-clay-blue")}>
              {player.name}
            </span>
            <span className="font-bold">{formatValue(score)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function GameOverStage({ view }: { view: RoomView }) {
  const s = view.state!;
  const top = ranking(s).slice(0, 3);
  const podium = [top[1], top[0], top[2]];
  const heights = ["h-24", "h-36", "h-16"];
  return (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      <div className="clay clay-grain p-5 text-center sm:p-8">
        <h2 className="text-3xl font-bold sm:text-4xl">🎉 Fin de la partie !</h2>
        <p className="text-ink-soft">Chacun a été décideur une fois. Voici qui repart avec le plus gros butin.</p>
        <div className="mt-8 flex items-end justify-center gap-3 sm:gap-6">
          {podium.map((entry, i) =>
            entry ? (
              <div key={entry.player.id} className="flex w-24 flex-col items-center sm:w-32">
                <Avatar id={entry.player.id} name={entry.player.name} avatar={entry.player.avatar} className="h-14 w-14 text-xl sm:h-20 sm:w-20 sm:text-3xl" />
                <p className="mt-1 w-full truncate font-bold">{entry.player.name}</p>
                <p className="text-sm font-semibold text-ink-soft">{formatValue(entry.score)}</p>
                <div
                  className={clsx("mt-2 flex w-full items-start justify-center rounded-t-3xl pt-2 text-3xl", heights[i])}
                  style={{
                    background: ["#c9d1e6", "#ffe814", "#f58d25"][i],
                    boxShadow: "inset 0 -6px 0 rgba(0,0,0,.12), inset 0 4px 6px rgba(255,255,255,.6)",
                  }}
                >
                  {["🥈", "🥇", "🥉"][i]}
                </div>
              </div>
            ) : (
              <div key={i} className="w-24 sm:w-32" />
            ),
          )}
        </div>
      </div>
      <div className="clay clay-grain p-5 sm:p-7">
        <h3 className="text-xl font-bold">Le butin de chacun</h3>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {ranking(s).map(({ player, score }) => (
            <li key={player.id} className="clay-sunken flex items-center gap-3 p-2.5">
              <Avatar id={player.id} name={player.name} avatar={player.avatar} className="h-9 w-9 text-sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold">{player.name}</span>
                <span className="block truncate text-lg" title={s.history.map((h) => h.entries.find((e) => e.playerId === player.id)?.lot.name).join(", ")}>
                  {s.history.map((h) => h.entries.find((e) => e.playerId === player.id)?.lot.emoji ?? "·").join(" ")}
                </span>
              </span>
              <span className="font-bold">{formatValue(score)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** Toutes les caméras en petit, en bas de l'écran pendant le reveal. */
export function CamStrip({ view }: { view: RoomView }) {
  const s = view.state!;
  return (
    <div className="scrollbar-soft flex gap-2 overflow-x-auto pb-1">
      {s.players.map((p) => (
        <PlayerTile
          key={p.id}
          id={p.id}
          name={p.id === s.deciderId ? `👑 ${p.name}` : p.name}
          avatar={p.avatar}
          className="aspect-video w-32 shrink-0 sm:w-40"
        />
      ))}
    </div>
  );
}
