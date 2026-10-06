import { containerOf, currentStep, eligibleDeciders, jokerAvailability, participants } from "./selectors";
import type { GameAction, GameState, RoomSettings } from "./types";

/** Coup que jouerait un bot maintenant (mode démo), ou null s'il n'a rien à faire. */
export function botMove(s: GameState, botId: string, settings: RoomSettings, rng: () => number): GameAction | null {
  const pick = <T,>(list: T[]): T => list[Math.floor(rng() * list.length)];

  switch (s.phase) {
    case "nomination":
      return eligibleDeciders(s).some((p) => p.id === botId) ? { type: "volunteer" } : null;

    case "picking": {
      if (containerOf(s, botId)) return null;
      if (botId !== s.deciderId && !containerOf(s, s.deciderId)) return null;
      const free = s.containers.filter((c) => !c.ownerId && !c.emergency && !c.discarded);
      return free.length ? { type: "pick", containerId: pick(free).id } : null;
    }

    case "discovery":
    case "decider": {
      const step = currentStep(s);
      if (step) {
        if (step.viewerId !== botId) return null;
        return step.opened ? { type: "done" } : { type: "open" };
      }
      if (s.phase !== "decider" || s.deciderId !== botId) return null;
      const avail = jokerAvailability(s, settings);
      const others = participants(s);
      const options: GameAction[] = [];
      if (avail.spy.enabled && avail.spy.available) {
        const spy = pick(others);
        const targets = s.containers.filter((c) => c.ownerId && c.ownerId !== spy.id && c.ownerId !== s.deciderId);
        if (targets.length) options.push({ type: "joker_spy", spyId: spy.id, containerId: pick(targets).id });
      }
      if (avail.switch.enabled && avail.switch.available) {
        const a = pick(others);
        const b = pick(others.filter((p) => p.id !== a.id));
        if (b) options.push({ type: "joker_switch", a: a.id, b: b.id });
      }
      if (avail.trust.enabled && avail.trust.available) options.push({ type: "joker_trust", viewerId: pick(others).id });
      if (avail.emergency.enabled && avail.emergency.available && rng() < 0.3) options.push({ type: "joker_emergency" });
      if (options.length && rng() < 0.75) return pick(options);
      if (avail.steal.enabled && rng() < 0.5) return { type: "steal", targetId: pick(others).id };
      return { type: "lock" };
    }

    case "reveal":
    case "results":
      return s.deciderId === botId ? (s.phase === "reveal" ? { type: "reveal_next" } : { type: "next_round" }) : null;

    default:
      return null;
  }
}

/** Délai « humain » avant qu'un bot joue ce coup (ms). */
export function botDelay(action: GameAction, rng: () => number): number {
  const jitter = rng() * 800;
  switch (action.type) {
    case "volunteer":
      return 3500 + rng() * 3000;
    case "pick":
      return 700 + jitter;
    case "open":
      return 1400 + jitter;
    case "done":
      return 2600 + jitter;
    case "reveal_next":
      return 2200 + jitter;
    case "next_round":
      return 6000;
    default:
      return 2400 + jitter;
  }
}

const BLUFFS = [
  "Franchement le mien est incroyable 😏",
  "Ne me volez pas svp 🙏",
  "J'ai rien de ouf… ou pas 🤫",
  "Le décideur a intérêt à me laisser tranquille",
  "Mdr je vais pleurer",
  "On se met d'accord pour bluffer ?",
  "Mon conteneur sent bizarre…",
  "JACKPOT (ou pas)",
];

export function botBluff(rng: () => number): string {
  return BLUFFS[Math.floor(rng() * BLUFFS.length)];
}

export const BOT_NAMES = ["Mamie Ginette", "Kévin", "Jean-Mi", "Samia", "Toto", "Léa", "Bernard", "Inès", "Yanis", "Chantal", "Hugo"];
