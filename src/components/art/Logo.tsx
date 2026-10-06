import clsx from "clsx";
import { shade } from "@/lib/color";

const LETTERS = [
  { ch: "D", color: "#5496ff", rot: -6 },
  { ch: "C", color: "#ff54ff", rot: 4 },
  { ch: "D", color: "#f58d25", rot: -3 },
  { ch: "S", color: "#4bf525", rot: 6 },
];

/** Logo « DCDS » en lettres de pâte à modeler. */
export function Logo({ size = "lg", className }: { size?: "sm" | "md" | "lg"; className?: string }) {
  const fontSize = size === "lg" ? "clamp(4.5rem, 14vw, 9rem)" : size === "md" ? "3.25rem" : "1.9rem";
  const stroke = size === "lg" ? 14 : size === "md" ? 8 : 5;
  return (
    <span className={clsx("inline-flex select-none items-end font-bold leading-none", className)} aria-label="DCDS">
      {LETTERS.map((l, i) => (
        <span
          key={i}
          aria-hidden
          style={{
            fontSize,
            color: l.color,
            transform: `rotate(${l.rot}deg)`,
            WebkitTextStroke: `${stroke}px #ffffff`,
            paintOrder: "stroke fill",
            textShadow: `0 ${stroke / 2}px 0 ${shade(l.color, -0.35)}, 0 ${stroke * 1.2}px ${stroke * 1.8}px rgba(16,36,110,0.45)`,
            display: "inline-block",
            marginLeft: i === 0 ? 0 : `-${stroke / 4}px`,
          }}
        >
          {l.ch}
        </span>
      ))}
    </span>
  );
}
