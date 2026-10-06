import { drawLots, formatValue, lotPool, shuffle } from "./lots";
import {
  containerById,
  containerOf,
  currentStep,
  eligibleDeciders,
  isParticipant,
  isPlayer,
  participants,
  playerName,
} from "./selectors";
import { CONTAINER_COLORS, EMERGENCY_CONTAINER_ID } from "./settings";
import type {
  EndReason,
  EngineContext,
  EngineResult,
  GameAction,
  GameSecret,
  GameState,
  KnowledgeEntry,
  LogKind,
  Lot,
  Player,
} from "./types";

const LOG_LIMIT = 40;

type Ctx = Omit<EngineContext, "actorId" | "isHost">;

export function createGame(players: Player[], ctx: Ctx): { state: GameState; secret: GameSecret } {
  const state: GameState = {
    round: 1,
    totalRounds: players.length,
    phase: "nomination",
    players,
    deciderId: null,
    pastDeciders: [],
    deciderMethod: null,
    containers: [],
    pickOrder: [],
    turn: null,
    action: null,
    jokersUsed: { trust: false, switch: false, spy: false },
    emergencyUsed: false,
    revealOrder: [],
    revealed: 0,
    endReason: null,
    deadline: null,
    scores: Object.fromEntries(players.map((p) => [p.id, 0])),
    history: [],
    log: [],
    logSeq: 0,
  };
  const secret: GameSecret = { lots: {}, usedLotIds: [] };
  beginNomination(state, secret, ctx);
  return { state, secret };
}

export function applyAction(
  stateIn: GameState,
  secretIn: GameSecret,
  action: GameAction,
  ctx: EngineContext,
): EngineResult {
  const state = structuredClone(stateIn);
  const secret = structuredClone(secretIn);
  const knowledge: KnowledgeEntry[] = [];
  const error = reduce(state, secret, knowledge, action, ctx);
  if (error) return { ok: false, error };
  return { ok: true, state, secret, knowledge };
}

function reduce(
  s: GameState,
  secret: GameSecret,
  knowledge: KnowledgeEntry[],
  action: GameAction,
  ctx: EngineContext,
): string | void {
  const actor = ctx.actorId;
  const isDecider = actor === s.deciderId;

  switch (action.type) {
    case "volunteer": {
      if (s.phase !== "nomination") return "La nomination est terminée.";
      if (!isPlayer(s, actor)) return "Tu ne joues pas cette partie.";
      if (s.pastDeciders.includes(actor)) return "Tu as déjà été décideur.";
      designate(s, secret, actor, "volunteer", ctx);
      return;
    }

    case "draw_decider": {
      if (s.phase !== "nomination") return "La nomination est terminée.";
      if (!ctx.isHost) return "Seul l'host peut lancer le tirage au sort.";
      drawDecider(s, secret, ctx);
      return;
    }

    case "pick": {
      if (s.phase !== "picking") return "Ce n'est pas le moment de choisir un conteneur.";
      if (!isPlayer(s, actor)) return "Tu ne joues pas cette partie.";
      if (containerOf(s, actor)) return "Tu as déjà un conteneur.";
      const c = containerById(s, action.containerId);
      if (!c || c.emergency || c.discarded) return "Conteneur introuvable.";
      if (c.ownerId) return "Trop tard, ce conteneur est déjà pris !";
      if (!isDecider && !containerOf(s, s.deciderId)) return "Le décideur choisit en premier.";
      c.ownerId = actor;
      if (!isDecider) s.pickOrder.push(actor);
      log(s, "pick", `${playerName(s, actor)} prend le conteneur n°${c.id}`, ctx.now);
      if (s.players.every((p) => containerOf(s, p.id))) startDiscovery(s);
      return;
    }

    case "open": {
      const step = currentStep(s);
      if (!step) return "Personne n'a de conteneur à ouvrir.";
      if (step.viewerId !== actor) return "Ce n'est pas ton tour.";
      if (step.opened) return "C'est déjà ouvert.";
      markSeen(s, secret, knowledge, actor, step.containerId);
      if (s.turn && s.phase === "discovery") s.turn.opened = true;
      if (s.action && s.phase === "decider") s.action.opened = true;
      return;
    }

    case "done": {
      const step = currentStep(s);
      if (!step) return "Rien à terminer.";
      if (step.viewerId !== actor) return "Ce n'est pas ton tour.";
      if (!step.opened) return "Ouvre d'abord le conteneur.";
      advanceStep(s);
      return;
    }

    case "joker_spy": {
      const err = guardJoker(s, ctx, isDecider, "spy");
      if (err) return err;
      if (!isParticipant(s, action.spyId)) return "Choisis un participant comme espion.";
      const target = containerById(s, action.containerId);
      if (!target || !target.ownerId || target.discarded) return "Conteneur introuvable.";
      if (target.ownerId === action.spyId) return "L'espion doit regarder le conteneur d'un autre.";
      if (target.ownerId === s.deciderId) return "Pour ton propre conteneur, utilise le joker Confiance.";
      s.jokersUsed.spy = true;
      s.action = { type: "spy", steps: [{ viewerId: action.spyId, containerId: target.id }], index: 0, opened: false };
      log(
        s,
        "spy",
        `🔍 Espion ! ${playerName(s, action.spyId)} va regarder le conteneur de ${playerName(s, target.ownerId)}`,
        ctx.now,
      );
      return;
    }

    case "joker_switch": {
      const err = guardJoker(s, ctx, isDecider, "switch");
      if (err) return err;
      if (action.a === action.b) return "Choisis deux participants différents.";
      if (!isParticipant(s, action.a) || !isParticipant(s, action.b)) return "Choisis deux participants.";
      const ca = containerOf(s, action.a);
      const cb = containerOf(s, action.b);
      if (!ca || !cb) return "Conteneurs introuvables.";
      ca.ownerId = action.b;
      cb.ownerId = action.a;
      s.jokersUsed.switch = true;
      s.action = {
        type: "switch",
        steps: [
          { viewerId: action.a, containerId: cb.id },
          { viewerId: action.b, containerId: ca.id },
        ],
        index: 0,
        opened: false,
      };
      log(s, "switch", `🔄 Switch ! ${playerName(s, action.a)} ⇄ ${playerName(s, action.b)}`, ctx.now);
      return;
    }

    case "joker_trust": {
      const err = guardJoker(s, ctx, isDecider, "trust");
      if (err) return err;
      if (!isParticipant(s, action.viewerId)) return "Choisis un participant.";
      const dc = containerOf(s, s.deciderId);
      if (!dc) return "Le décideur n'a pas de conteneur.";
      s.jokersUsed.trust = true;
      s.action = { type: "trust", steps: [{ viewerId: action.viewerId, containerId: dc.id }], index: 0, opened: false };
      log(
        s,
        "trust",
        `🤝 Confiance ! ${playerName(s, action.viewerId)} va regarder le conteneur du décideur`,
        ctx.now,
      );
      return;
    }

    case "joker_emergency": {
      const err = guardJoker(s, ctx, isDecider, "emergency");
      if (err) return err;
      const dc = containerOf(s, s.deciderId);
      if (!dc) return "Le décideur n'a pas de conteneur.";
      const used = new Set(secret.usedLotIds);
      const [lot] = drawLots(1, lotPool(ctx.settings.lotsMode, ctx.settings.customLots), used, ctx.rng);
      secret.usedLotIds = [...used];
      dc.ownerId = null;
      dc.discarded = true;
      s.containers.push({
        id: EMERGENCY_CONTAINER_ID,
        color: "#ff3b3b",
        ownerId: s.deciderId,
        seenBy: [],
        emergency: true,
      });
      secret.lots[EMERGENCY_CONTAINER_ID] = lot;
      s.emergencyUsed = true;
      log(s, "emergency", `🚨 Conteneur d'urgence ! ${playerName(s, s.deciderId)} abandonne son conteneur`, ctx.now);
      return;
    }

    case "steal": {
      const err = guardJoker(s, ctx, isDecider, "steal");
      if (err) return err;
      if (!isParticipant(s, action.targetId)) return "Choisis un participant à voler.";
      const dc = containerOf(s, s.deciderId);
      const tc = containerOf(s, action.targetId);
      if (!dc || !tc) return "Conteneurs introuvables.";
      dc.ownerId = action.targetId;
      tc.ownerId = s.deciderId;
      log(s, "steal", `👑 Vol ! ${playerName(s, s.deciderId)} vole le conteneur de ${playerName(s, action.targetId)}`, ctx.now);
      finishRound(s, "steal");
      return;
    }

    case "lock": {
      if (s.phase !== "decider") return "Ce n'est pas le moment.";
      if (!isDecider) return "Seul le décideur peut verrouiller son choix.";
      if (s.action) return "Attends la fin du joker en cours.";
      log(s, "lock", `🔒 ${playerName(s, s.deciderId)} garde son conteneur`, ctx.now);
      finishRound(s, "keep");
      return;
    }

    case "reveal_next": {
      if (s.phase !== "reveal") return "Ce n'est pas le moment du reveal.";
      if (!isDecider && !ctx.isHost) return "Seuls le décideur et l'host mènent le reveal.";
      revealNext(s, secret, ctx.now);
      return;
    }

    case "next_round": {
      if (s.phase !== "results") return "La manche n'est pas terminée.";
      if (!isDecider && !ctx.isHost) return "Seuls le décideur et l'host lancent la suite.";
      nextRound(s, secret, ctx);
      return;
    }

    case "skip": {
      if (!ctx.isHost) return "Seul l'host peut forcer la suite.";
      return skip(s, secret, ctx);
    }

    case "timeout": {
      if (!s.deadline || ctx.now < s.deadline) return "Le temps n'est pas écoulé.";
      if (s.phase !== "picking" && s.phase !== "discovery" && s.phase !== "decider") return "Rien à interrompre.";
      autoAssign(s, ctx.rng);
      log(s, "timeout", "⏰ Temps écoulé ! Place au reveal", ctx.now);
      finishRound(s, "timeout");
      return;
    }
  }
}

function guardJoker(
  s: GameState,
  ctx: EngineContext,
  isDecider: boolean,
  key: "spy" | "switch" | "trust" | "emergency" | "steal",
): string | void {
  if (s.phase !== "decider") return "Les jokers s'utilisent pendant la phase du décideur.";
  if (!isDecider) return "Seul le décideur peut utiliser les jokers.";
  if (s.action) return "Attends la fin du joker en cours.";
  if (!ctx.settings.jokers[key]) return "Ce joker est désactivé dans cette partie.";
  if (key === "emergency" && s.emergencyUsed) return "Le conteneur d'urgence a déjà servi dans cette partie.";
  if (key !== "emergency" && key !== "steal" && s.jokersUsed[key]) return "Joker déjà utilisé cette manche.";
}

function log(s: GameState, kind: LogKind, text: string, at: number) {
  s.logSeq += 1;
  s.log.push({ id: s.logSeq, at, kind, text });
  if (s.log.length > LOG_LIMIT) s.log.splice(0, s.log.length - LOG_LIMIT);
}

function beginNomination(s: GameState, secret: GameSecret, ctx: Ctx) {
  s.phase = "nomination";
  s.deciderId = null;
  s.deciderMethod = null;
  s.containers = [];
  s.pickOrder = [];
  s.turn = null;
  s.action = null;
  s.revealOrder = [];
  s.revealed = 0;
  s.endReason = null;
  s.deadline = null;
  secret.lots = {};
  log(s, "round", `Manche ${s.round} sur ${s.totalRounds}`, ctx.now);
  const eligible = eligibleDeciders(s);
  if (eligible.length === 1) designate(s, secret, eligible[0].id, "last", ctx);
}

function drawDecider(s: GameState, secret: GameSecret, ctx: Ctx) {
  const eligible = eligibleDeciders(s);
  const chosen = eligible[Math.floor(ctx.rng() * eligible.length)];
  if (chosen) designate(s, secret, chosen.id, "draw", ctx);
}

function designate(s: GameState, secret: GameSecret, deciderId: string, method: GameState["deciderMethod"], ctx: Ctx) {
  s.deciderId = deciderId;
  s.deciderMethod = method;
  s.pastDeciders.push(deciderId);
  const how = method === "volunteer" ? "se porte volontaire" : method === "draw" ? "est tiré(e) au sort" : "est le dernier décideur";
  log(s, "decider", `👑 ${playerName(s, deciderId)} ${how} !`, ctx.now);
  dealRound(s, secret, ctx);
}

function dealRound(s: GameState, secret: GameSecret, ctx: Ctx) {
  const used = new Set(secret.usedLotIds);
  const lots = drawLots(s.players.length, lotPool(ctx.settings.lotsMode, ctx.settings.customLots), used, ctx.rng);
  secret.usedLotIds = [...used];
  s.containers = lots.map((_, i) => ({
    id: i + 1,
    color: CONTAINER_COLORS[i % CONTAINER_COLORS.length],
    ownerId: null,
    seenBy: [],
  }));
  secret.lots = Object.fromEntries(lots.map((lot, i) => [i + 1, lot])) as Record<number, Lot>;
  s.phase = "picking";
  s.pickOrder = [];
  s.turn = null;
  s.action = null;
  s.jokersUsed = { trust: false, switch: false, spy: false };
  s.revealOrder = [];
  s.revealed = 0;
  s.endReason = null;
  s.deadline = ctx.settings.roundMinutes > 0 ? ctx.now + ctx.settings.roundMinutes * 60_000 : null;
}

function startDiscovery(s: GameState) {
  s.phase = "discovery";
  s.turn = { order: [...s.pickOrder], index: 0, opened: false };
  if (s.turn.order.length === 0) {
    s.phase = "decider";
    s.turn = null;
  }
}

function markSeen(s: GameState, secret: GameSecret, knowledge: KnowledgeEntry[], userId: string, containerId: number) {
  const c = containerById(s, containerId);
  const lot = secret.lots[containerId];
  if (!c || !lot) return;
  if (!c.seenBy.includes(userId)) c.seenBy.push(userId);
  knowledge.push({ userId, round: s.round, containerId, lot });
}

function advanceStep(s: GameState) {
  if (s.phase === "discovery" && s.turn) {
    s.turn.index += 1;
    s.turn.opened = false;
    if (s.turn.index >= s.turn.order.length) {
      s.turn = null;
      s.phase = "decider";
    }
    return;
  }
  if (s.phase === "decider" && s.action) {
    s.action.index += 1;
    s.action.opened = false;
    if (s.action.index >= s.action.steps.length) s.action = null;
  }
}

/** Attribue au hasard les conteneurs restants (timeout ou host qui force). */
function autoAssign(s: GameState, rng: () => number) {
  const free = shuffle(
    s.containers.filter((c) => !c.ownerId && !c.emergency && !c.discarded),
    rng,
  );
  const waiting = [
    ...s.players.filter((p) => p.id === s.deciderId),
    ...s.players.filter((p) => p.id !== s.deciderId),
  ].filter((p) => !containerOf(s, p.id));
  for (const p of waiting) {
    const c = free.shift();
    if (!c) break;
    c.ownerId = p.id;
    if (p.id !== s.deciderId) s.pickOrder.push(p.id);
  }
}

function finishRound(s: GameState, reason: EndReason) {
  s.phase = "reveal";
  s.action = null;
  s.turn = null;
  s.deadline = null;
  s.endReason = reason;
  const order = participants(s)
    .map((p) => containerOf(s, p.id)?.id)
    .filter((id): id is number => id !== undefined);
  const discarded = s.containers.filter((c) => c.discarded).map((c) => c.id);
  const deciderContainer = containerOf(s, s.deciderId)?.id;
  s.revealOrder = [...order, ...discarded, ...(deciderContainer !== undefined ? [deciderContainer] : [])];
  s.revealed = 0;
}

function revealNext(s: GameState, secret: GameSecret, now: number) {
  if (s.revealed < s.revealOrder.length) {
    const cid = s.revealOrder[s.revealed];
    const c = containerById(s, cid);
    const lot = secret.lots[cid];
    if (c && lot) {
      c.lot = lot;
      const who = c.discarded ? "Le conteneur abandonné" : `Le conteneur de ${playerName(s, c.ownerId)}`;
      log(s, "reveal", `${who} : ${lot.emoji} ${lot.name}`, now);
    }
    s.revealed += 1;
    return;
  }
  computeResults(s, secret, now);
}

function computeResults(s: GameState, secret: GameSecret, now: number) {
  const entries = s.players.flatMap((p) => {
    const c = containerOf(s, p.id);
    const lot = c ? secret.lots[c.id] : undefined;
    return c && lot ? [{ playerId: p.id, containerId: c.id, lot }] : [];
  });
  for (const e of entries) s.scores[e.playerId] = (s.scores[e.playerId] ?? 0) + e.lot.value;
  if (s.deciderId) s.history.push({ round: s.round, deciderId: s.deciderId, entries });
  const best = [...entries].sort((a, b) => b.lot.value - a.lot.value)[0];
  if (best) {
    log(s, "results", `🏆 Meilleur lot : ${playerName(s, best.playerId)} avec ${best.lot.name} (${formatValue(best.lot.value)})`, now);
  }
  s.phase = "results";
}

function nextRound(s: GameState, secret: GameSecret, ctx: Ctx) {
  if (eligibleDeciders(s).length === 0) {
    s.phase = "game_over";
    s.deciderId = null;
    log(s, "game_over", "🎉 Fin de la partie !", ctx.now);
    return;
  }
  s.round += 1;
  beginNomination(s, secret, ctx);
}

function skip(s: GameState, secret: GameSecret, ctx: EngineContext): string | void {
  const by = "⏭️ L'host fait avancer la partie";
  switch (s.phase) {
    case "nomination":
      drawDecider(s, secret, ctx);
      return;
    case "picking":
      autoAssign(s, ctx.rng);
      log(s, "skip", `${by} : conteneurs attribués au hasard`, ctx.now);
      startDiscovery(s);
      return;
    case "discovery":
      log(s, "skip", `${by} : tour de ${playerName(s, currentStep(s)?.viewerId)} passé`, ctx.now);
      advanceStep(s);
      return;
    case "decider":
      if (s.action) {
        log(s, "skip", `${by} : joker écourté`, ctx.now);
        advanceStep(s);
      } else {
        log(s, "skip", `${by} : le décideur garde son conteneur`, ctx.now);
        finishRound(s, "keep");
      }
      return;
    case "reveal":
      revealNext(s, secret, ctx.now);
      return;
    case "results":
      nextRound(s, secret, ctx);
      return;
    case "game_over":
      return "La partie est terminée.";
  }
}
