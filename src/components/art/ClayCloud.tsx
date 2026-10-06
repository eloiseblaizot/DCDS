"use client";

import { useId } from "react";

export type CloudVariant = "plain" | "face" | "trust" | "switch" | "spy" | "steal" | "emergency";

const BODY =
  "M52 132C28 132 14 114 20 96C8 84 14 60 36 58C38 36 62 24 82 34C94 12 130 10 144 32C164 22 190 34 190 58C210 64 214 92 198 106C204 124 186 136 168 132Z";

const INK = "#1d2a5c";

function Eyes({ x1 = 92, y1 = 80, x2 = 126, y2 = 78, r = 11, look = 1.5 }) {
  return (
    <g>
      {[
        [x1, y1],
        [x2, y2],
      ].map(([x, y], i) => (
        <g key={i}>
          <ellipse cx={x} cy={y} rx={r} ry={r * 1.15} fill="#fff" stroke={INK} strokeWidth={1.6} />
          <circle cx={x + look} cy={y + 1.5} r={r * 0.48} fill="#111" />
          <circle cx={x + look + 1.8} cy={y - 1} r={r * 0.15} fill="#fff" />
        </g>
      ))}
    </g>
  );
}

function Mouth({ x = 96, y = 98, w = 34 }) {
  return (
    <path
      d={`M${x} ${y} Q${x + w / 2} ${y + 20} ${x + w} ${y - 2} Q${x + w / 2} ${y + 9} ${x} ${y} Z`}
      fill="#e8303a"
      stroke="#b31b25"
      strokeWidth={1.6}
      strokeLinejoin="round"
    />
  );
}

/**
 * Nuage en pâte à modeler. Les variantes reprennent les jokers de l'émission :
 * Confiance (casquette), Switch (flèches), Espion (loupe), Vol (couronne), Urgence (gyrophare).
 */
export function ClayCloud({
  variant = "face",
  className,
  texture = true,
  title,
}: {
  variant?: CloudVariant;
  className?: string;
  texture?: boolean;
  title?: string;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const g = `g${uid}`;
  const shadow = `s${uid}`;
  const clip = `c${uid}`;
  const noise = `n${uid}`;
  const bottom = `b${uid}`;
  const hasFace = variant !== "plain";

  return (
    <svg viewBox="-10 -40 240 200" className={className} role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <defs>
        <radialGradient id={g} cx="38%" cy="28%" r="78%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="55%" stopColor="#f1f3f9" />
          <stop offset="100%" stopColor="#c9d1e6" />
        </radialGradient>
        <linearGradient id={bottom} x1="0" y1="0" x2="0" y2="1">
          <stop offset="55%" stopColor="#1d2a5c" stopOpacity="0" />
          <stop offset="100%" stopColor="#1d2a5c" stopOpacity="0.16" />
        </linearGradient>
        <filter id={shadow} x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="#10246e" floodOpacity="0.32" />
        </filter>
        <clipPath id={clip}>
          <path d={BODY} />
        </clipPath>
        {texture && (
          <filter id={noise}>
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" />
            <feColorMatrix values="0 0 0 0 0.35 0 0 0 0 0.38 0 0 0 0 0.5 0 0 0 0.55 0" />
          </filter>
        )}
      </defs>

      {variant === "trust" && <TrustBuddy />}

      <g filter={`url(#${shadow})`}>
        <path d={BODY} fill={`url(#${g})`} />
      </g>
      <path d={BODY} fill={`url(#${bottom})`} />
      {texture && (
        <rect x="0" y="0" width="220" height="140" filter={`url(#${noise})`} clipPath={`url(#${clip})`} opacity="0.22" />
      )}

      {hasFace && (
        <>
          <Eyes />
          <Mouth />
        </>
      )}

      {variant === "switch" && <SwitchArrows />}
      {variant === "spy" && <Magnifier />}
      {variant === "steal" && <CrownAndLoot />}
      {variant === "emergency" && <Siren />}
    </svg>
  );
}

function TrustBuddy() {
  // Petit nuage à casquette rose perché sur le grand.
  return (
    <g transform="translate(40 -30) scale(0.5)">
      <path d={BODY} fill="#f4f6fb" stroke="#d3daea" strokeWidth={3} />
      <Eyes x1={92} y1={84} x2={124} y2={82} r={12} />
      <Mouth x={98} y={104} w={28} />
      <path d="M56 46C60 0 160 -4 166 42Z" fill="#ff8f8f" stroke="#d65b5b" strokeWidth={4} />
      <path d="M150 40C176 36 200 44 204 52C180 56 160 52 150 48Z" fill="#ff7a7a" stroke="#d65b5b" strokeWidth={4} />
      <ellipse cx="96" cy="16" rx="22" ry="8" fill="#ffffff" opacity="0.45" />
    </g>
  );
}

function SwitchArrows() {
  const arrow = (d: string, head: string) => (
    <g>
      <path d={d} fill="none" stroke="#123c9c" strokeWidth={17} strokeLinecap="round" />
      <path d={d} fill="none" stroke="#2a6af0" strokeWidth={12} strokeLinecap="round" />
      <polygon points={head} fill="#2a6af0" stroke="#123c9c" strokeWidth={3} strokeLinejoin="round" />
    </g>
  );
  return (
    <g>
      {arrow("M118 -14C160 -18 192 4 196 34", "180,34 212,30 196,58")}
      {arrow("M104 150C62 154 30 132 26 104", "42,104 10,108 26,80")}
    </g>
  );
}

function Magnifier() {
  return (
    <g>
      <path d="M108 96L136 132" stroke="#111" strokeWidth={11} strokeLinecap="round" />
      <circle cx="92" cy="80" r="23" fill="#d6ecff" fillOpacity="0.35" stroke="#111" strokeWidth={6} />
      <path d="M78 70a16 16 0 0 1 14 -9" stroke="#fff" strokeWidth={3} strokeLinecap="round" fill="none" opacity="0.8" />
      <path d="M150 110c10 4 16 14 10 22" stroke="#d3daea" strokeWidth={8} strokeLinecap="round" fill="none" />
    </g>
  );
}

function CrownAndLoot() {
  return (
    <g>
      <path
        d="M84 32L80 -6L100 14L112 -14L124 14L144 -6L140 32Z"
        fill="#ffd21f"
        stroke="#a87b00"
        strokeWidth={3}
        strokeLinejoin="round"
      />
      <circle cx="112" cy="-14" r="4" fill="#ff4f5e" />
      <path d="M88 26H136" stroke="#e0a800" strokeWidth={4} />
      <g transform="translate(176 92) rotate(-12)">
        <rect x="0" y="0" width="36" height="26" rx="5" fill="#f58d25" stroke="#a9550d" strokeWidth={2.5} />
        {[7, 14, 21, 28].map((x) => (
          <rect key={x} x={x} y="4" width="3" height="18" fill="#ffb466" />
        ))}
      </g>
    </g>
  );
}

function Siren() {
  return (
    <g>
      <g stroke="#ffd21f" strokeWidth={6} strokeLinecap="round">
        <line x1="70" y1="-10" x2="84" y2="2">
          <animate attributeName="opacity" values="1;0.2;1" dur="0.8s" repeatCount="indefinite" />
        </line>
        <line x1="154" y1="-10" x2="140" y2="2">
          <animate attributeName="opacity" values="0.2;1;0.2" dur="0.8s" repeatCount="indefinite" />
        </line>
        <line x1="112" y1="-34" x2="112" y2="-20">
          <animate attributeName="opacity" values="1;0.2;1" dur="0.8s" repeatCount="indefinite" />
        </line>
      </g>
      <rect x="88" y="18" width="48" height="12" rx="4" fill="#3b4566" />
      <path d="M94 20C94 -12 130 -12 130 20Z" fill="#ff3b3b" stroke="#b3141c" strokeWidth={3} />
      <ellipse cx="104" cy="2" rx="5" ry="8" fill="#ffffff" opacity="0.6" />
    </g>
  );
}
