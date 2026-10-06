import { ClayCloud } from "./ClayCloud";

const CLOUDS = [
  { top: "4%", left: "-6%", w: 260, dur: 70, delay: -10, op: 1 },
  { top: "1%", left: "38%", w: 200, dur: 90, delay: -40, op: 0.9 },
  { top: "10%", left: "82%", w: 230, dur: 80, delay: -25, op: 1 },
  { top: "62%", left: "-10%", w: 340, dur: 110, delay: -60, op: 0.95 },
  { top: "70%", left: "78%", w: 380, dur: 120, delay: -5, op: 0.95 },
  { top: "40%", left: "92%", w: 150, dur: 60, delay: -30, op: 0.7 },
];

/** Ciel bleu avec nuages en pâte qui dérivent doucement (décor de fond). */
export function Sky() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_0%,rgba(255,255,255,0.18),transparent_60%)]" />
      {CLOUDS.map((c, i) => (
        <div
          key={i}
          className="absolute"
          style={{
            top: c.top,
            left: c.left,
            width: c.w,
            opacity: c.op,
            animation: `sky-drift ${c.dur}s ease-in-out ${c.delay}s infinite alternate`,
          }}
        >
          <ClayCloud variant="plain" texture={false} />
        </div>
      ))}
      <style>{`@keyframes sky-drift { from { transform: translateX(-30px) } to { transform: translateX(40px) } }`}</style>
    </div>
  );
}
