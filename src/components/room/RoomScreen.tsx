"use client";

import { GameScreen } from "@/components/game/GameScreen";
import { Lobby } from "@/components/lobby/Lobby";
import type { RoomView } from "@/lib/client/roomView";

export function RoomScreen({ view }: { view: RoomView }) {
  if (view.status === "lobby" || !view.state) return <Lobby view={view} />;
  return <GameScreen view={view} />;
}

export function CenterMessage({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-dvh items-center justify-center p-4 pt-24">{children}</div>;
}

export function Loading({ text = "Chargement du salon…" }: { text?: string }) {
  return (
    <CenterMessage>
      <div className="clay px-8 py-6 text-center font-bold">
        <div className="mx-auto mb-2 h-10 w-10 animate-spin rounded-full border-4 border-clay-blue border-t-transparent" />
        {text}
      </div>
    </CenterMessage>
  );
}
