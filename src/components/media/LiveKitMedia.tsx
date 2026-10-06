"use client";

import {
  isTrackReference,
  LiveKitRoom,
  RoomAudioRenderer,
  StartAudio,
  useLocalParticipant,
  useParticipants,
  useTracks,
} from "@livekit/components-react";
import { Track, VideoPresets } from "livekit-client";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/client/supabase";
import type { RoomSettings } from "@/lib/game/types";
import { MediaContext, NO_MEDIA, type MediaValue, type TileMedia } from "./MediaContext";

/** Connexion à la salle vidéo/audio LiveKit du salon. */
export function LiveKitMedia({
  code,
  settings,
  canPublish,
  children,
}: {
  code: string;
  settings: RoomSettings;
  canPublish: boolean;
  children: React.ReactNode;
}) {
  const enabled = settings.video || settings.audio;
  const [conn, setConn] = useState<{ token: string; url: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    api<{ token: string | null; url: string | null }>("/api/livekit/token", { code })
      .then((res) => {
        if (!alive) return;
        if (res.token && res.url) setConn({ token: res.token, url: res.url });
      })
      .catch((err: Error) => alive && setError(err.message));
    return () => {
      alive = false;
      setConn(null);
    };
  }, [code, enabled, settings.video, settings.audio, canPublish]);

  if (!enabled || !conn) {
    return (
      <MediaContext.Provider value={{ ...NO_MEDIA, videoEnabled: settings.video, audioEnabled: settings.audio, error }}>
        {children}
      </MediaContext.Provider>
    );
  }

  return (
    <LiveKitRoom
      serverUrl={conn.url}
      token={conn.token}
      connect
      audio={settings.audio && canPublish}
      video={settings.video && canPublish ? { resolution: VideoPresets.h360.resolution } : false}
      options={{ adaptiveStream: true, dynacast: true }}
      style={{ display: "contents" }}
      onError={(err) => setError(err.message)}
      onMediaDeviceFailure={() => setError("Impossible d'accéder à ta caméra ou ton micro.")}
    >
      <Bridge settings={settings} canPublish={canPublish} error={error}>
        {children}
      </Bridge>
      {settings.audio && <RoomAudioRenderer />}
      {settings.audio && (
        <StartAudio
          label="🔊 Activer le son"
          className="clay-btn yellow fixed bottom-24 left-1/2 z-50 -translate-x-1/2"
        />
      )}
    </LiveKitRoom>
  );
}

function Bridge({
  settings,
  canPublish,
  error,
  children,
}: {
  settings: RoomSettings;
  canPublish: boolean;
  error: string | null;
  children: React.ReactNode;
}) {
  const cameraTracks = useTracks([Track.Source.Camera], { onlySubscribed: true });
  const participants = useParticipants();
  const { localParticipant, isCameraEnabled, isMicrophoneEnabled } = useLocalParticipant();

  const value = useMemo<MediaValue>(() => {
    const tiles: Record<string, TileMedia> = {};
    for (const p of participants) {
      tiles[p.identity] = {
        speaking: p.isSpeaking,
        camOff: !p.isCameraEnabled,
        micOff: !p.isMicrophoneEnabled,
        isLocal: p.isLocal,
      };
    }
    for (const ref of cameraTracks) {
      if (!isTrackReference(ref) || ref.publication.isMuted) continue;
      const id = ref.participant.identity;
      tiles[id] = { ...(tiles[id] ?? { speaking: false, camOff: false, micOff: true }), video: ref };
    }
    return {
      kind: "livekit",
      videoEnabled: settings.video,
      audioEnabled: settings.audio,
      tiles,
      error,
      local: {
        camOn: isCameraEnabled,
        micOn: isMicrophoneEnabled,
        canPublish,
        toggleCam: () => void localParticipant.setCameraEnabled(!isCameraEnabled),
        toggleMic: () => void localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled),
      },
    };
  }, [participants, cameraTracks, settings.video, settings.audio, error, isCameraEnabled, isMicrophoneEnabled, canPublish, localParticipant]);

  return <MediaContext.Provider value={value}>{children}</MediaContext.Provider>;
}
