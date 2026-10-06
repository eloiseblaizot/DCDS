import type { ContainerPub, GameState, JokerKey, Player, RoomSettings } from "./types";

export function playerById(s: GameState, id: string | null | undefined): Player | undefined {
  return id ? s.players.find((p) => p.id === id) : undefined;
}

export function playerName(s: GameState, id: string | null | undefined): string {
  return playerById(s, id)?.name ?? "Quelqu'un";
}

export function containerById(s: GameState, id: number): ContainerPub | undefined {
  return s.containers.find((c) => c.id === id);
}

export function containerOf(s: GameState, playerId: string | null | undefined): ContainerPub | undefined {
  if (!playerId) return undefined;
  return s.containers.find((c) => c.ownerId === playerId);
}

export function isPlayer(s: GameState, id: string): boolean {
  return s.players.some((p) => p.id === id);
}

export function isParticipant(s: GameState, id: string): boolean {
  return isPlayer(s, id) && id !== s.deciderId;
}

export function participants(s: GameState): Player[] {
  return s.players.filter((p) => p.id !== s.deciderId);
}

export function eligibleDeciders(s: GameState): Player[] {
  return s.players.filter((p) => !s.pastDeciders.includes(p.id));
}

export interface CurrentStep {
  kind: "discovery" | "spy" | "switch" | "trust";
  viewerId: string;
  containerId: number;
  opened: boolean;
  index: number;
  total: number;
}

/** Qui est en train de découvrir un conteneur, et lequel. */
export function currentStep(s: GameState): CurrentStep | null {
  if (s.phase === "discovery" && s.turn) {
    const viewerId = s.turn.order[s.turn.index];
    const c = containerOf(s, viewerId);
    if (!viewerId || !c) return null;
    return {
      kind: "discovery",
      viewerId,
      containerId: c.id,
      opened: s.turn.opened,
      index: s.turn.index,
      total: s.turn.order.length,
    };
  }
  if (s.phase === "decider" && s.action) {
    const step = s.action.steps[s.action.index];
    if (!step) return null;
    return {
      kind: s.action.type,
      viewerId: step.viewerId,
      containerId: step.containerId,
      opened: s.action.opened,
      index: s.action.index,
      total: s.action.steps.length,
    };
  }
  return null;
}

/** Joueur affiché sur l'écran géant. */
export function spotlightId(s: GameState): string | null {
  const step = currentStep(s);
  if (step) return step.viewerId;
  if (s.phase === "decider" || s.phase === "picking") return s.deciderId;
  if (s.phase === "reveal" && s.revealed > 0) {
    const c = containerById(s, s.revealOrder[s.revealed - 1]);
    return c?.ownerId ?? s.deciderId;
  }
  return null;
}

export function jokerAvailability(
  s: GameState,
  settings: RoomSettings,
): Record<JokerKey, { enabled: boolean; available: boolean }> {
  const open = s.phase === "decider" && !s.action;
  const enoughParticipants = participants(s).length >= 2;
  return {
    trust: { enabled: settings.jokers.trust, available: open && !s.jokersUsed.trust },
    switch: { enabled: settings.jokers.switch, available: open && !s.jokersUsed.switch && enoughParticipants },
    spy: { enabled: settings.jokers.spy, available: open && !s.jokersUsed.spy && enoughParticipants },
    steal: { enabled: settings.jokers.steal, available: open },
    emergency: { enabled: settings.jokers.emergency, available: open && !s.emergencyUsed },
  };
}

export const PHASE_LABELS: Record<GameState["phase"], string> = {
  nomination: "Nomination du décideur",
  picking: "Choix des conteneurs",
  discovery: "Phase de découverte",
  decider: "Au tour du décideur",
  reveal: "Le grand reveal",
  results: "Résultats de la manche",
  game_over: "Fin de la partie",
};

export function ranking(s: GameState): { player: Player; score: number }[] {
  return s.players
    .map((player) => ({ player, score: s.scores[player.id] ?? 0 }))
    .sort((a, b) => b.score - a.score);
}
