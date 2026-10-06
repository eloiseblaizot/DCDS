"use client";

import clsx from "clsx";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ChatMessage, RoomView } from "@/lib/client/roomView";
import { colorFor } from "@/lib/color";
import { isParticipant } from "@/lib/game/selectors";

type Tab = ChatMessage["channel"];

export function ChatPanel({ view, className }: { view: RoomView; className?: string }) {
  const s = view.state;
  const playing = !!s && s.phase !== "game_over";
  const inGame = !!s && s.players.some((p) => p.id === view.me.id);
  const iAmDecider = !!s && s.deciderId === view.me.id;
  const canWriteParticipants = playing && isParticipant(s!, view.me.id);

  const tabs = useMemo(() => {
    const t: Tab[] = [];
    if (view.settings.chatGlobal) t.push("global");
    if (view.settings.chatParticipants && playing && inGame) t.push("participants");
    return t;
  }, [view.settings.chatGlobal, view.settings.chatParticipants, playing, inGame]);

  const [chosen, setChosen] = useState<Tab | null>(null);
  const tab: Tab | undefined = chosen && tabs.includes(chosen) ? chosen : tabs[0];
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const shown = view.messages.filter((m) => m.channel === tab);
  const [seenAt, setSeenAt] = useState<Record<Tab, number>>({ global: 0, participants: 0 });

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [shown.length, tab]);

  if (!tab) {
    return (
      <div className={clsx("clay p-4 text-center text-sm font-semibold text-ink-soft", className)}>
        💬 Le chat est désactivé pour cette partie.
      </div>
    );
  }

  const locked = tab === "participants" && !canWriteParticipants;

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body || locked) return;
    setDraft("");
    const ok = await view.sendChat(tab, body);
    if (!ok) setDraft(body);
  };

  return (
    <div className={clsx("clay flex min-h-0 flex-col overflow-hidden", className)}>
      <div className="flex gap-1 p-2">
        {tabs.map((t) => {
          const unread = t !== tab && view.messages.some((m) => m.channel === t && m.at > seenAt[t]);
          return (
            <button
              key={t}
              type="button"
              onClick={() => {
                const now = Date.now();
                if (tab) setSeenAt((prev) => ({ ...prev, [tab]: now, [t]: now }));
                setChosen(t);
              }}
              className={clsx(
                "relative flex-1 rounded-2xl px-3 py-1.5 text-sm font-bold transition",
                t === tab ? (t === "participants" ? "bg-clay-pink text-white" : "bg-clay-blue text-white") : "bg-ink/6 text-ink-soft",
              )}
            >
              {t === "global" ? "💬 Global" : "🤫 Participants"}
              {unread && <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-clay-red ring-2 ring-white" />}
            </button>
          );
        })}
      </div>

      {tab === "participants" && iAmDecider ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-5 text-center">
          <span className="text-4xl">🤫</span>
          <p className="font-bold">Les participants complotent…</p>
          <p className="text-sm text-ink-soft">En tant que décideur, tu ne peux pas lire ce chat. Méfie-toi !</p>
        </div>
      ) : (
        <div ref={listRef} className="scrollbar-soft min-h-0 flex-1 space-y-1.5 overflow-y-auto px-3 pb-2">
          {shown.length === 0 && (
            <p className="py-6 text-center text-sm text-ink-soft">
              {tab === "participants" ? "Mettez-vous d'accord pour bluffer le décideur 😏" : "Dis bonjour !"}
            </p>
          )}
          {shown.map((m) => (
            <p key={m.id} className="text-sm leading-snug break-words">
              <span className="font-bold" style={{ color: m.userId ? colorFor(m.userId) : undefined }}>
                {m.name}
              </span>{" "}
              <span className={m.userId === view.me.id ? "text-ink" : "text-ink/85"}>{m.body}</span>
            </p>
          ))}
        </div>
      )}

      <form onSubmit={send} className="flex gap-2 border-t-2 border-ink/5 p-2">
        <input
          className="clay-input py-2 text-sm"
          value={draft}
          maxLength={500}
          disabled={locked}
          placeholder={locked ? (iAmDecider ? "Réservé aux participants" : "Chat fermé") : "Écris un message…"}
          onChange={(e) => setDraft(e.target.value)}
          aria-label="Message"
        />
        <button className="clay-btn sm shrink-0" disabled={locked || !draft.trim()} aria-label="Envoyer">
          ➤
        </button>
      </form>
    </div>
  );
}
