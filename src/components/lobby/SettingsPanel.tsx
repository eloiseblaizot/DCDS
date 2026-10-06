"use client";

import clsx from "clsx";
import { useState } from "react";
import { ClayCloud } from "@/components/art/ClayCloud";
import { isHost, type RoomView } from "@/lib/client/roomView";
import { CATALOG, TIER_ORDER, TIERS } from "@/lib/game/lots";
import { JOKER_ORDER, JOKERS, MAX_PLAYERS, ROUND_LIMITS } from "@/lib/game/settings";
import type { Lot, LotsMode, RoomSettings, Tier } from "@/lib/game/types";

function Toggle({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className={clsx("flex items-start gap-3 py-2", disabled ? "cursor-default" : "cursor-pointer")}>
      <span className="min-w-0 flex-1">
        <span className="block font-bold">{label}</span>
        {description && <span className="block text-xs text-ink-soft">{description}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={clsx(
          "relative mt-0.5 h-8 w-14 shrink-0 rounded-full transition-colors disabled:opacity-60",
          checked ? "bg-[#2fd60c]" : "bg-ink/15",
        )}
        style={{ boxShadow: "inset 0 3px 6px rgba(16,36,110,.25)" }}
      >
        <span
          className={clsx(
            "absolute top-1 h-6 w-6 rounded-full bg-white transition-all",
            checked ? "left-7" : "left-1",
          )}
          style={{ boxShadow: "inset 0 -3px 0 #d5dbec, 0 2px 4px rgba(16,36,110,.3)" }}
        />
      </button>
    </label>
  );
}

function Segmented<T extends string | number>({
  options,
  value,
  disabled,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  disabled?: boolean;
  onChange: (v: T) => void;
}) {
  return (
    <div className="clay-sunken flex flex-wrap gap-1 p-1">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          disabled={disabled}
          onClick={() => onChange(o.value)}
          className={clsx(
            "flex-1 whitespace-nowrap rounded-[14px] px-2.5 py-1.5 text-sm font-bold transition",
            o.value === value ? "bg-clay-blue text-white shadow-[inset_0_-3px_0_rgba(0,0,0,.18)]" : "text-ink-soft hover:bg-white/60",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t-2 border-ink/5 pt-3">
      <p className="mb-1 text-xs font-bold uppercase tracking-wider text-ink-soft">{title}</p>
      {children}
    </div>
  );
}

function CustomLotsEditor({
  lots,
  disabled,
  onChange,
}: {
  lots: Lot[];
  disabled: boolean;
  onChange: (lots: Lot[]) => void;
}) {
  const [emoji, setEmoji] = useState("🎁");
  const [name, setName] = useState("");
  const [tier, setTier] = useState<Tier>("cool");

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const lot: Lot = {
      id: `u-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      emoji: emoji.trim() || "🎁",
      name: name.trim().slice(0, 80),
      tier,
      value: TIERS[tier].defaultValue,
      custom: true,
    };
    onChange([...lots, lot]);
    setName("");
  };

  return (
    <div className="mt-2 space-y-2">
      {lots.length > 0 && (
        <ul className="scrollbar-soft max-h-48 space-y-1 overflow-y-auto pr-1">
          {lots.map((l) => (
            <li key={l.id} className="clay-sunken flex items-center gap-2 px-2.5 py-1.5 text-sm">
              <span className="text-xl">{l.emoji}</span>
              <span className="min-w-0 flex-1 truncate font-semibold">{l.name}</span>
              <span className="pill" style={{ background: TIERS[l.tier].color, color: TIERS[l.tier].ink }}>
                {TIERS[l.tier].label}
              </span>
              {!disabled && (
                <button
                  type="button"
                  aria-label={`Retirer ${l.name}`}
                  className="text-ink-soft hover:text-clay-red"
                  onClick={() => onChange(lots.filter((x) => x.id !== l.id))}
                >
                  ✕
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {!disabled && (
        <form onSubmit={add} className="space-y-2">
          <div className="flex gap-2">
            <input
              className="clay-input w-16 text-center text-xl"
              value={emoji}
              onChange={(e) => setEmoji(e.target.value)}
              aria-label="Emoji du lot"
              maxLength={8}
            />
            <input
              className="clay-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Un vrai cadeau, un gage…"
              aria-label="Nom du lot"
              maxLength={80}
            />
          </div>
          <div className="flex gap-2">
            <select
              className="clay-input"
              value={tier}
              onChange={(e) => setTier(e.target.value as Tier)}
              aria-label="Rareté du lot"
            >
              {TIER_ORDER.map((t) => (
                <option key={t} value={t}>
                  {TIERS[t].label}
                </option>
              ))}
            </select>
            <button className="clay-btn sm shrink-0" disabled={!name.trim() || lots.length >= 120}>
              ＋ Ajouter
            </button>
          </div>
        </form>
      )}
      {lots.length === 0 && <p className="text-xs text-ink-soft">Aucun lot perso pour l&apos;instant.</p>}
    </div>
  );
}

export function SettingsPanel({ view }: { view: RoomView }) {
  const host = isHost(view);
  const locked = !host || view.status === "playing";
  const [pending, setPending] = useState<Partial<RoomSettings>>({});
  const s: RoomSettings = { ...view.settings, ...pending };

  const update = async (patch: Partial<RoomSettings>) => {
    if (locked) return;
    const next = { ...s, ...patch };
    setPending((p) => ({ ...p, ...patch }));
    await view.roomAction({ type: "settings", settings: next });
    setPending({});
  };

  const jokerCount = JOKER_ORDER.filter((k) => s.jokers[k]).length;

  return (
    <section className="clay clay-grain space-y-3 p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">⚙️ Réglages</h2>
        {!host && <span className="pill bg-ink/8 text-ink-soft">Choisis par l&apos;host</span>}
      </div>

      <Section title="Salon">
        <Toggle
          label="Partie publique"
          description="Visible dans la liste des parties publiques. Sinon : code ou lien uniquement."
          checked={s.isPublic}
          disabled={locked}
          onChange={(v) => update({ isPublic: v })}
        />
        <div className="flex items-center justify-between py-2">
          <span className="font-bold">Joueurs max</span>
          <div className="flex items-center gap-2">
            <button type="button" className="clay-btn sm light" disabled={locked || s.maxPlayers <= 4} onClick={() => update({ maxPlayers: s.maxPlayers - 1 })}>
              −
            </button>
            <span className="w-8 text-center text-xl font-bold tabular-nums">{s.maxPlayers}</span>
            <button
              type="button"
              className="clay-btn sm light"
              disabled={locked || s.maxPlayers >= MAX_PLAYERS}
              onClick={() => update({ maxPlayers: s.maxPlayers + 1 })}
            >
              +
            </button>
          </div>
        </div>
      </Section>

      <Section title="Caméras & micros">
        <Toggle label="Vidéo" description="Les webcams s'affichent sur l'écran géant." checked={s.video} disabled={locked} onChange={(v) => update({ video: v })} />
        <Toggle
          label="Micros"
          description="À couper si vous êtes déjà en vocal Discord ou en stream."
          checked={s.audio}
          disabled={locked}
          onChange={(v) => update({ audio: v })}
        />
      </Section>

      <Section title="Chat">
        <Toggle label="Chat global" description="Tout le salon, décideur et spectateurs compris." checked={s.chatGlobal} disabled={locked} onChange={(v) => update({ chatGlobal: v })} />
        <Toggle
          label="Chat des participants"
          description="Chat secret entre participants : le décideur ne le voit pas."
          checked={s.chatParticipants}
          disabled={locked}
          onChange={(v) => update({ chatParticipants: v })}
        />
      </Section>

      <Section title={`Jokers (${jokerCount}/5)`}>
        <div className="grid grid-cols-3 gap-2 pt-1 sm:grid-cols-5 lg:grid-cols-3">
          {JOKER_ORDER.map((k) => {
            const on = s.jokers[k];
            return (
              <button
                key={k}
                type="button"
                disabled={locked}
                title={JOKERS[k].description}
                onClick={() => update({ jokers: { ...s.jokers, [k]: !on } })}
                className={clsx(
                  "flex flex-col items-center rounded-2xl p-1.5 transition",
                  on ? "bg-clay-blue/12" : "opacity-45 grayscale",
                  !locked && "hover:-translate-y-0.5",
                )}
              >
                <ClayCloud variant={k} className="h-12 w-16" texture={false} />
                <span className="text-xs font-bold">{JOKERS[k].short}</span>
                <span className="text-[10px] font-bold text-ink-soft">{on ? "Activé" : "Désactivé"}</span>
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Temps par manche">
        <Segmented
          disabled={locked}
          value={s.roundMinutes}
          onChange={(v) => update({ roundMinutes: v })}
          options={ROUND_LIMITS.map((m) => ({ value: m as number, label: m === 0 ? "Illimité" : `${m} min` }))}
        />
      </Section>

      <Section title="Lots">
        <Segmented<LotsMode>
          disabled={locked}
          value={s.lotsMode}
          onChange={(v) => update({ lotsMode: v })}
          options={[
            { value: "catalog", label: `Catalogue (${CATALOG.length})` },
            { value: "custom", label: "Mes lots" },
            { value: "mixed", label: "Les deux" },
          ]}
        />
        {s.lotsMode !== "catalog" && (
          <CustomLotsEditor lots={s.customLots} disabled={locked} onChange={(customLots) => update({ customLots })} />
        )}
        {s.lotsMode === "custom" && s.customLots.length < 6 && (
          <p className="mt-1 text-xs font-semibold text-clay-orange">
            Astuce : ajoute au moins un lot par joueur (sinon des lots reviendront plusieurs fois).
          </p>
        )}
      </Section>
    </section>
  );
}
