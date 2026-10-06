"use client";

import type { TrackReference } from "@livekit/components-react";
import { createContext, useContext } from "react";

export interface TileMedia {
  video?: TrackReference | MediaStream;
  speaking: boolean;
  camOff: boolean;
  micOff: boolean;
  isLocal?: boolean;
}

export interface MediaValue {
  kind: "none" | "livekit" | "demo";
  videoEnabled: boolean;
  audioEnabled: boolean;
  tiles: Record<string, TileMedia>;
  local: {
    camOn: boolean;
    micOn: boolean;
    canPublish: boolean;
    toggleCam(): void;
    toggleMic(): void;
  } | null;
  error?: string | null;
}

export const NO_MEDIA: MediaValue = { kind: "none", videoEnabled: false, audioEnabled: false, tiles: {}, local: null };

export const MediaContext = createContext<MediaValue>(NO_MEDIA);

export const useMedia = () => useContext(MediaContext);
