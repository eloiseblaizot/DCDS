import { describe, expect, it } from "vitest";
import { botMove } from "./bots";
import { applyAction, createGame } from "./engine";
import { containerOf, currentStep, participants } from "./selectors";
import { DEFAULT_SETTINGS, EMERGENCY_CONTAINER_ID } from "./settings";
import type { GameAction, GameSecret, GameState, KnowledgeEntry, Player, RoomSettings } from "./types";

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const makePlayers = (n: number): Player[] =>
  Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}`, name: `Joueur ${i + 1}`, avatar: null }));

function setup(n: number, settings: RoomSettings = DEFAULT_SETTINGS, seed = 1) {
  const rng = mulberry32(seed);
  const { state, secret } = createGame(makePlayers(n), { now: 0, rng, settings });
  return { state, secret, rng, settings };
}

function act(
  g: { state: GameState; secret: GameSecret; rng: () => number; settings: RoomSettings },
  actorId: string,
  action: GameAction,
  opts: { host?: boolean; now?: number } = {},
) {
  const res = applyAction(g.state, g.secret, action, {
    actorId,
    isHost: opts.host ?? actorId === "p1",
    now: opts.now ?? 1000,
    rng: g.rng,
    settings: g.settings,
  });
  if (!res.ok) throw new Error(res.error);
  g.state = res.state;
  g.secret = res.secret;
  return res.knowledge;
}

function tryAct(
  g: { state: GameState; secret: GameSecret; rng: () => number; settings: RoomSettings },
  actorId: string,
  action: GameAction,
) {
  return applyAction(g.state, g.secret, action, {
    actorId,
    isHost: actorId === "p1",
    now: 1000,
    rng: g.rng,
    settings: g.settings,
  });
}

describe("nomination & choix des conteneurs", () => {
  it("le décideur choisit en premier, puis premier arrivé premier servi", () => {
    const g = setup(4);
    expect(g.state.phase).toBe("nomination");
    act(g, "p3", { type: "volunteer" });
    expect(g.state.deciderId).toBe("p3");
    expect(g.state.phase).toBe("picking");
    expect(g.state.containers).toHaveLength(4);

    const early = tryAct(g, "p2", { type: "pick", containerId: 1 });
    expect(early.ok).toBe(false);

    act(g, "p3", { type: "pick", containerId: 2 });
    act(g, "p1", { type: "pick", containerId: 1 });
    const taken = tryAct(g, "p2", { type: "pick", containerId: 1 });
    expect(taken.ok).toBe(false);
    act(g, "p2", { type: "pick", containerId: 4 });
    act(g, "p4", { type: "pick", containerId: 3 });

    expect(g.state.phase).toBe("discovery");
    expect(g.state.turn?.order).toEqual(["p1", "p2", "p4"]);
  });

  it("le dernier joueur éligible devient décideur automatiquement", () => {
    const g = setup(3);
    act(g, "p1", { type: "volunteer" });
    playRoundWithBots(g);
    act(g, "p1", { type: "next_round" }, { host: true });
    act(g, "p2", { type: "volunteer" });
    playRoundWithBots(g);
    act(g, "p1", { type: "next_round" }, { host: true });
    expect(g.state.deciderId).toBe("p3");
    expect(g.state.deciderMethod).toBe("last");
  });
});

describe("découverte & secret", () => {
  it("seul le participant reçoit le contenu de son conteneur", () => {
    const g = setup(4);
    act(g, "p1", { type: "volunteer" });
    act(g, "p1", { type: "pick", containerId: 1 });
    act(g, "p2", { type: "pick", containerId: 2 });
    act(g, "p3", { type: "pick", containerId: 3 });
    act(g, "p4", { type: "pick", containerId: 4 });
    expect(tryAct(g, "p3", { type: "open" }).ok).toBe(false);
    expect(tryAct(g, "p2", { type: "done" }).ok).toBe(false);
    const k = act(g, "p2", { type: "open" });
    expect(k).toEqual([{ userId: "p2", round: 1, containerId: 2, lot: g.secret.lots[2] }]);
    expect(g.state.containers[1].seenBy).toEqual(["p2"]);
    expect(g.state.containers[1].lot).toBeUndefined();
    act(g, "p2", { type: "done" });
    expect(currentStep(g.state)?.viewerId).toBe("p3");
  });
});

function toDeciderPhase(g: ReturnType<typeof setup>) {
  act(g, "p1", { type: "volunteer" });
  g.state.players.forEach((p, i) => act(g, p.id, { type: "pick", containerId: i + 1 }));
  while (g.state.phase === "discovery") {
    const step = currentStep(g.state)!;
    act(g, step.viewerId, { type: "open" });
    act(g, step.viewerId, { type: "done" });
  }
  expect(g.state.phase).toBe("decider");
}

describe("jokers", () => {
  it("switch échange les conteneurs et fait découvrir les deux", () => {
    const g = setup(4);
    toDeciderPhase(g);
    const before2 = containerOf(g.state, "p2")!.id;
    const before3 = containerOf(g.state, "p3")!.id;
    act(g, "p1", { type: "joker_switch", a: "p2", b: "p3" });
    expect(containerOf(g.state, "p2")!.id).toBe(before3);
    expect(containerOf(g.state, "p3")!.id).toBe(before2);
    expect(currentStep(g.state)).toMatchObject({ kind: "switch", viewerId: "p2", containerId: before3 });
    expect(tryAct(g, "p1", { type: "lock" }).ok).toBe(false);
    act(g, "p2", { type: "open" });
    act(g, "p2", { type: "done" });
    const k = act(g, "p3", { type: "open" });
    expect(k[0].containerId).toBe(before2);
    act(g, "p3", { type: "done" });
    expect(g.state.action).toBeNull();
    expect(tryAct(g, "p1", { type: "joker_switch", a: "p2", b: "p4" }).ok).toBe(false);
  });

  it("espion et confiance donnent l'info au bon joueur", () => {
    const g = setup(4);
    toDeciderPhase(g);
    expect(tryAct(g, "p1", { type: "joker_spy", spyId: "p2", containerId: containerOf(g.state, "p1")!.id }).ok).toBe(false);
    act(g, "p1", { type: "joker_spy", spyId: "p2", containerId: containerOf(g.state, "p4")!.id });
    const k = act(g, "p2", { type: "open" });
    expect(k[0]).toMatchObject({ userId: "p2", containerId: containerOf(g.state, "p4")!.id });
    act(g, "p2", { type: "done" });
    act(g, "p1", { type: "joker_trust", viewerId: "p3" });
    const k2 = act(g, "p3", { type: "open" });
    expect(k2[0].containerId).toBe(containerOf(g.state, "p1")!.id);
    expect(k2[0].lot).toEqual(g.secret.lots[containerOf(g.state, "p1")!.id]);
  });

  it("conteneur d'urgence : une seule fois par partie", () => {
    const g = setup(3);
    toDeciderPhase(g);
    const old = containerOf(g.state, "p1")!.id;
    act(g, "p1", { type: "joker_emergency" });
    expect(containerOf(g.state, "p1")!.id).toBe(EMERGENCY_CONTAINER_ID);
    expect(g.state.containers.find((c) => c.id === old)?.discarded).toBe(true);
    act(g, "p1", { type: "lock" });
    expect(g.state.revealOrder.at(-1)).toBe(EMERGENCY_CONTAINER_ID);
    expect(g.state.revealOrder).toContain(old);
    while (g.state.phase === "reveal") act(g, "p1", { type: "reveal_next" });
    act(g, "p1", { type: "next_round" });
    act(g, "p2", { type: "volunteer" });
    act(g, "p2", { type: "pick", containerId: 1 });
    act(g, "p1", { type: "pick", containerId: 2 });
    act(g, "p3", { type: "pick", containerId: 3 });
    while (g.state.phase === "discovery") {
      const step = currentStep(g.state)!;
      act(g, step.viewerId, { type: "open" });
      act(g, step.viewerId, { type: "done" });
    }
    expect(tryAct(g, "p2", { type: "joker_emergency" }).ok).toBe(false);
  });

  it("vol : le décideur récupère le conteneur et on passe au reveal", () => {
    const g = setup(4);
    toDeciderPhase(g);
    const target = containerOf(g.state, "p3")!.id;
    act(g, "p1", { type: "steal", targetId: "p3" });
    expect(containerOf(g.state, "p1")!.id).toBe(target);
    expect(g.state.phase).toBe("reveal");
    expect(g.state.endReason).toBe("steal");
  });

  it("joker désactivé = refusé", () => {
    const g = setup(4, { ...DEFAULT_SETTINGS, jokers: { ...DEFAULT_SETTINGS.jokers, spy: false } });
    toDeciderPhase(g);
    expect(tryAct(g, "p1", { type: "joker_spy", spyId: "p2", containerId: 3 }).ok).toBe(false);
  });
});

describe("temps limité", () => {
  it("le timeout attribue les conteneurs restants et passe au reveal", () => {
    const g = setup(4, { ...DEFAULT_SETTINGS, roundMinutes: 3 });
    act(g, "p1", { type: "volunteer" }, { now: 0 });
    expect(g.state.deadline).toBe(3 * 60_000);
    act(g, "p1", { type: "pick", containerId: 1 });
    expect(tryAct(g, "p2", { type: "timeout" }).ok).toBe(false);
    act(g, "p2", { type: "timeout" }, { now: 10 * 60_000 });
    expect(g.state.phase).toBe("reveal");
    expect(g.state.players.every((p) => containerOf(g.state, p.id))).toBe(true);
  });
});

function playRoundWithBots(g: ReturnType<typeof setup>, knowledge: KnowledgeEntry[] = []) {
  for (let guard = 0; guard < 500; guard++) {
    if (g.state.phase === "results" || g.state.phase === "game_over") return;
    if (g.state.phase !== "reveal") {
      expect(g.state.containers.some((c) => c.lot)).toBe(false);
    }
    const movers = g.state.players
      .map((p) => ({ id: p.id, move: botMove(g.state, p.id, g.settings, g.rng) }))
      .filter((m) => m.move);
    if (!movers.length) throw new Error(`Bloqué en phase ${g.state.phase}`);
    const m = movers[Math.floor(g.rng() * movers.length)];
    knowledge.push(...act(g, m.id, m.move!));
  }
  throw new Error("Manche trop longue");
}

describe("partie complète avec bots", () => {
  for (const n of [3, 4, 6, 8, 12]) {
    it(`${n} joueurs : chacun est décideur une fois et les scores sont cohérents`, () => {
      const g = setup(n, { ...DEFAULT_SETTINGS, maxPlayers: 12 }, n * 7);
      const knowledge: KnowledgeEntry[] = [];
      while (g.state.phase !== "game_over") {
        playRoundWithBots(g, knowledge);
        if (g.state.phase === "results") {
          const r = g.state.history.at(-1)!;
          expect(r.entries).toHaveLength(n);
          act(g, g.state.deciderId!, { type: "next_round" });
        }
      }
      expect(g.state.history).toHaveLength(n);
      expect(new Set(g.state.history.map((h) => h.deciderId)).size).toBe(n);
      for (const p of g.state.players) {
        const total = g.state.history.flatMap((h) => h.entries).filter((e) => e.playerId === p.id);
        expect(g.state.scores[p.id]).toBe(total.reduce((sum, e) => sum + e.lot.value, 0));
      }
      // Le décideur ne reçoit jamais d'info sur son propre conteneur pendant sa manche.
      for (const h of g.state.history) {
        const leaks = knowledge.filter((k) => k.round === h.round && k.userId === h.deciderId);
        expect(leaks).toHaveLength(0);
      }
      expect(participants(g.state)).toHaveLength(n);
    });
  }
});
