"use client";

import { useId } from "react";
import { shade } from "@/lib/color";

/** Conteneur maritime vu de face, façon pâte à modeler. */
export function ContainerArt({
  color,
  number,
  emergency = false,
  discarded = false,
  className,
}: {
  color: string;
  number?: number | string;
  emergency?: boolean;
  discarded?: boolean;
  className?: string;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const body = `body${uid}`;
  const stripes = `stripes${uid}`;
  const noise = `noise${uid}`;
  const clip = `clip${uid}`;
  const base = discarded ? "#9aa3b8" : color;
  const dark = shade(base, -0.32);
  const darker = shade(base, -0.5);
  const light = shade(base, 0.35);

  return (
    <svg viewBox="0 0 200 160" className={className} aria-hidden>
      <defs>
        <linearGradient id={body} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={light} />
          <stop offset="45%" stopColor={base} />
          <stop offset="100%" stopColor={dark} />
        </linearGradient>
        <pattern id={stripes} width="28" height="28" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
          <rect width="14" height="28" fill="#ffffff" opacity="0.9" />
        </pattern>
        <clipPath id={clip}>
          <rect x="10" y="22" width="180" height="118" rx="16" />
        </clipPath>
        <filter id={noise}>
          <feTurbulence type="fractalNoise" baseFrequency="0.95" numOctaves="2" seed="7" />
          <feColorMatrix values="0 0 0 0 0.2 0 0 0 0 0.2 0 0 0 0 0.3 0 0 0 0.5 0" />
        </filter>
      </defs>

      <ellipse cx="100" cy="150" rx="88" ry="7" fill="#10246e" opacity="0.22" />

      {emergency && (
        <g>
          <rect x="84" y="8" width="32" height="10" rx="3" fill="#3b4566" />
          <path d="M88 10C88 -8 112 -8 112 10Z" fill="#ff3b3b" stroke="#b3141c" strokeWidth={2.5} />
          <ellipse cx="96" cy="0" rx="3" ry="5" fill="#fff" opacity="0.6" />
        </g>
      )}

      <rect x="10" y="22" width="180" height="118" rx="16" fill={`url(#${body})`} stroke={darker} strokeWidth={3} />

      <g clipPath={`url(#${clip})`}>
        {emergency && <rect x="10" y="22" width="180" height="118" fill={`url(#${stripes})`} opacity="0.55" />}
        {Array.from({ length: 10 }, (_, i) => (
          <g key={i}>
            <rect x={20 + i * 17} y="36" width="7" height="90" rx="3" fill={light} opacity="0.45" />
            <rect x={27 + i * 17} y="36" width="3" height="90" rx="1.5" fill={dark} opacity="0.45" />
          </g>
        ))}
        <rect x="10" y="22" width="180" height="15" fill={dark} />
        <rect x="10" y="125" width="180" height="15" fill={dark} />
        <rect x="10" y="22" width="180" height="5" fill={light} opacity="0.5" />
        <rect x="0" y="0" width="200" height="160" filter={`url(#${noise})`} opacity="0.18" />
      </g>

      <line x1="100" y1="37" x2="100" y2="125" stroke={darker} strokeWidth={3} />
      {[58, 78, 122, 142].map((x) => (
        <g key={x}>
          <line x1={x} y1="40" x2={x} y2="122" stroke={darker} strokeWidth={6} strokeLinecap="round" />
          <line x1={x} y1="40" x2={x} y2="122" stroke="#eef2fb" strokeWidth={3.5} strokeLinecap="round" />
          <rect x={x - 5} y="86" width="10" height="14" rx="3" fill="#eef2fb" stroke={darker} strokeWidth={2} />
        </g>
      ))}

      {number !== undefined && (
        <g>
          <circle cx="100" cy="72" r="21" fill="#ffffff" stroke={darker} strokeWidth={3} />
          <text
            x="100"
            y="80"
            textAnchor="middle"
            fontSize={emergency ? 15 : 24}
            fontWeight={700}
            fill="#1d2a5c"
            fontFamily="var(--font-display)"
          >
            {number}
          </text>
        </g>
      )}
      <rect x="22" y="26" width="70" height="7" rx="3.5" fill="#ffffff" opacity="0.35" />
    </svg>
  );
}
