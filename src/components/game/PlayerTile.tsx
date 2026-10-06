"use client";

import { VideoTrack } from "@livekit/components-react";
import clsx from "clsx";
import { useEffect, useRef } from "react";
import { colorFor, shade } from "@/lib/color";
import { useMedia } from "@/components/media/MediaContext";

export function Avatar({
  id,
  name,
  avatar,
  className,
}: {
  id: string;
  name: string;
  avatar: string | null;
  className?: string;
}) {
  const color = colorFor(id);
  if (avatar) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatar}
        alt=""
        referrerPolicy="no-referrer"
        className={clsx("aspect-square rounded-full object-cover shadow-[0_3px_0_rgba(16,36,110,0.25)]", className)}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={clsx("inline-flex aspect-square items-center justify-center rounded-full font-bold text-white", className)}
      style={{
        background: `radial-gradient(120% 120% at 30% 25%, ${shade(color, 0.35)}, ${color} 60%)`,
        boxShadow: `inset 0 -3px 0 ${shade(color, -0.3)}, 0 3px 6px -2px rgba(16,36,110,.4)`,
      }}
    >
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}

function StreamVideo({ stream, mirror }: { stream: MediaStream; mirror?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream;
  }, [stream]);
  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      muted
      className="h-full w-full object-cover"
      style={mirror ? { transform: "scaleX(-1)" } : undefined}
    />
  );
}

/**
 * Tuile d'un joueur : sa webcam si dispo, sinon son avatar.
 * L'anneau vert indique qu'il parle.
 */
export function PlayerTile({
  id,
  name,
  avatar,
  className,
  label = true,
  badge,
  dim = false,
  rounded = "rounded-[20px]",
}: {
  id: string;
  name: string;
  avatar: string | null;
  className?: string;
  label?: boolean;
  badge?: React.ReactNode;
  dim?: boolean;
  rounded?: string;
}) {
  const media = useMedia();
  const m = media.tiles[id];
  const video = m?.video;
  const color = colorFor(id);

  return (
    <div
      className={clsx(
        "relative isolate overflow-hidden transition-[box-shadow,filter] duration-200",
        rounded,
        m?.speaking ? "shadow-[0_0_0_4px_#4bf525,0_8px_20px_-6px_rgba(16,36,110,.6)]" : "shadow-[0_8px_20px_-8px_rgba(16,36,110,.6)]",
        dim && "grayscale-[0.7] opacity-60",
        className,
      )}
      style={{ background: `linear-gradient(160deg, ${shade(color, 0.55)}, ${shade(color, 0.15)})` }}
    >
      {video ? (
        video instanceof MediaStream ? (
          <StreamVideo stream={video} mirror={m?.isLocal} />
        ) : (
          <VideoTrack
            trackRef={video}
            className="h-full w-full object-cover"
            style={m?.isLocal ? { transform: "scaleX(-1)" } : undefined}
          />
        )
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <Avatar id={id} name={name} avatar={avatar} className="h-[48%] max-h-40 min-h-8 text-[clamp(1rem,4vw,3.5rem)]" />
        </div>
      )}
      {label && (
        <div className="absolute inset-x-1.5 bottom-1.5 flex items-center gap-1">
          <span className="truncate rounded-full bg-white/90 px-2 py-0.5 text-xs font-bold text-ink shadow">
            {name}
          </span>
          {media.audioEnabled && m?.micOff && (
            <span className="rounded-full bg-clay-red px-1.5 py-0.5 text-[10px] font-bold text-white" title="Micro coupé">
              🔇
            </span>
          )}
        </div>
      )}
      {badge && <div className="absolute right-1.5 top-1.5">{badge}</div>}
    </div>
  );
}
