"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MediaContext, type MediaValue, type TileMedia } from "./MediaContext";

/** Médias du mode démo : ta webcam locale (optionnelle) et des bots qui « parlent ». */
export function DemoMedia({ meId, playerIds, children }: { meId: string; playerIds: string[]; children: React.ReactNode }) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [speaking, setSpeaking] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const idsKey = playerIds.join(",");

  useEffect(() => {
    const ids = idsKey.split(",");
    const iv = setInterval(() => {
      setSpeaking(new Set(ids.filter((id) => id !== meId && Math.random() < 0.12)));
    }, 1300);
    return () => clearInterval(iv);
  }, [idsKey, meId]);

  useEffect(() => () => stream?.getTracks().forEach((t) => t.stop()), [stream]);

  const toggleCam = useCallback(async () => {
    if (stream) {
      setStream(null);
      return;
    }
    try {
      setStream(await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 360 }, audio: false }));
      setError(null);
    } catch {
      setError("Caméra indisponible ou refusée.");
    }
  }, [stream]);

  const value = useMemo<MediaValue>(() => {
    const tiles: Record<string, TileMedia> = {};
    for (const id of idsKey.split(",")) tiles[id] = { speaking: speaking.has(id), camOff: true, micOff: true };
    tiles[meId] = { video: stream ?? undefined, speaking: false, camOff: !stream, micOff: true, isLocal: true };
    return {
      kind: "demo",
      videoEnabled: true,
      audioEnabled: false,
      tiles,
      error,
      local: { camOn: !!stream, micOn: false, canPublish: true, toggleCam: () => void toggleCam(), toggleMic: () => {} },
    };
  }, [idsKey, speaking, meId, stream, error, toggleCam]);

  return <MediaContext.Provider value={value}>{children}</MediaContext.Provider>;
}
