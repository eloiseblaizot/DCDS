"use client";

import clsx from "clsx";
import { useState } from "react";
import { DemoMedia } from "@/components/media/DemoMedia";
import { useMedia } from "@/components/media/MediaContext";
import { RoomScreen } from "@/components/room/RoomScreen";
import { useDemoRoom } from "@/lib/client/useDemoRoom";

function DemoToolbar({
  demo,
}: {
  demo: ReturnType<typeof useDemoRoom>;
}) {
  const { view, perspective, setPerspective, botCount, setBotCount, paused, setPaused } = demo;
  const media = useMedia();
  const [open, setOpen] = useState(false);
  const players = view.state?.players ?? view.members;

  return (
    <div className="fixed bottom-3 left-3 z-40 max-w-[calc(100vw-1.5rem)]">
      {open ? (
        <div className="clay w-72 space-y-2 p-3 text-sm">
          <div className="flex items-center justify-between">
            <p className="font-bold">🧪 Mode solo (démo locale)</p>
            <button type="button" className="text-ink-soft" onClick={() => setOpen(false)} aria-label="Réduire">
              ▾
            </button>
          </div>
          <p className="text-xs text-ink-soft">Les autres joueurs sont des bots. Rien ne quitte ton navigateur.</p>
          <label className="block">
            <span className="text-xs font-bold text-ink-soft">Jouer en tant que</span>
            <select className="clay-input mt-1 py-1.5 text-sm" value={perspective} onChange={(e) => setPerspective(e.target.value)}>
              {players.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {view.state?.deciderId === p.id ? " 👑" : ""}
                </option>
              ))}
            </select>
          </label>
          {view.status === "lobby" && (
            <label className="block">
              <span className="text-xs font-bold text-ink-soft">Nombre de bots : {botCount}</span>
              <input
                type="range"
                min={2}
                max={view.settings.maxPlayers - 1}
                value={botCount}
                onChange={(e) => setBotCount(Number(e.target.value))}
                className="mt-1 w-full accent-[#5496ff]"
              />
            </label>
          )}
          <div className="flex gap-2">
            <button type="button" className={clsx("clay-btn sm flex-1", paused ? "green" : "light")} onClick={() => setPaused(!paused)}>
              {paused ? "▶ Reprendre" : "⏸ Pause bots"}
            </button>
            <button type="button" className={clsx("clay-btn sm flex-1", media.local?.camOn ? "red" : "light")} onClick={() => media.local?.toggleCam()}>
              {media.local?.camOn ? "Couper cam" : "📷 Ma cam"}
            </button>
          </div>
          {media.error && <p className="text-xs font-semibold text-clay-red">{media.error}</p>}
        </div>
      ) : (
        <button type="button" className="clay-btn sm light" onClick={() => setOpen(true)}>
          🧪 Démo
        </button>
      )}
    </div>
  );
}

export function DemoClient() {
  const demo = useDemoRoom("Toi");
  const ids = (demo.view.state?.players ?? demo.view.members).map((p) => p.id);
  return (
    <DemoMedia meId={demo.view.me.id} playerIds={ids}>
      <RoomScreen view={demo.view} />
      <DemoToolbar demo={demo} />
    </DemoMedia>
  );
}
