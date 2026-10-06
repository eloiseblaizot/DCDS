"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RoomAction } from "@/lib/game/actions";
import { BOT_NAMES, botBluff, botDelay, botMove } from "@/lib/game/bots";
import { applyAction, createGame } from "@/lib/game/engine";
import { isParticipant } from "@/lib/game/selectors";
import { DEFAULT_SETTINGS, MIN_PLAYERS } from "@/lib/game/settings";
import type { GameAction, GameSecret, GameState, KnowledgeEntry, RoomSettings } from "@/lib/game/types";
import type { ChatMessage, MemberView, RoomStatus, RoomView } from "./roomView";

export const DEMO_HUMAN_ID = "demo-you";

interface DemoGame {
  status: RoomStatus;
  state: GameState | null;
  secret: GameSecret;
  knowledge: KnowledgeEntry[];
  rev: number;
}

const emptyGame = (): DemoGame => ({
  status: "lobby",
  state: null,
  secret: { lots: {}, usedLotIds: [] },
  knowledge: [],
  rev: 0,
});

function makeMembers(name: string, bots: number): MemberView[] {
  return [
    { id: DEMO_HUMAN_ID, name: name || "Toi", avatar: null, role: "player", online: true },
    ...BOT_NAMES.slice(0, bots).map((n, i) => ({
      id: `demo-bot-${i + 1}`,
      name: n,
      avatar: null,
      role: "player" as const,
      online: true,
    })),
  ];
}

/**
 * Salon 100 % local : le moteur tourne dans le navigateur et des bots jouent
 * les autres joueurs. « perspective » = le joueur que l'on contrôle.
 */
export function useDemoRoom(humanName: string) {
  const [botCount, setBotCount] = useState(5);
  const [members, setMembers] = useState<MemberView[]>(() => makeMembers(humanName, 5));
  const [settings, setSettings] = useState<RoomSettings>({ ...DEFAULT_SETTINGS, video: false, audio: false });
  const [game, setGame] = useState<DemoGame>(emptyGame);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [perspective, setPerspective] = useState(DEMO_HUMAN_ID);
  const [error, setError] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const gameRef = useRef(game);
  const msgSeq = useRef(0);

  const commit = useCallback((next: DemoGame) => {
    gameRef.current = next;
    setGame(next);
  }, []);

  const resize = useCallback(
    (bots: number) => {
      setBotCount(bots);
      setMembers(makeMembers(humanName, bots));
    },
    [humanName],
  );

  const pushMessage = useCallback((m: Omit<ChatMessage, "id" | "at">) => {
    msgSeq.current += 1;
    const id = msgSeq.current;
    setMessages((prev) => [...prev.slice(-150), { ...m, id, at: Date.now() }]);
  }, []);

  /** Applique une action au nom de `actorId`. */
  const dispatch = useCallback(
    (actorId: string, action: GameAction): string | null => {
      const g = gameRef.current;
      if (!g.state) return "Aucune partie en cours.";
      const res = applyAction(g.state, g.secret, action, {
        actorId,
        isHost: true,
        now: Date.now(),
        rng: Math.random,
        settings,
      });
      if (!res.ok) return res.error;
      const next: DemoGame = {
        status: res.state.phase === "game_over" ? "finished" : "playing",
        state: res.state,
        secret: res.secret,
        knowledge: [...g.knowledge, ...res.knowledge],
        rev: g.rev + 1,
      };
      commit(next);
      return null;
    },
    [settings, commit],
  );

  // Boucle des bots : un coup à la fois, avec un délai « humain ».
  useEffect(() => {
    const s = game.state;
    if (!s || paused || s.phase === "game_over") return;
    const moves = s.players
      .filter((p) => p.id !== perspective)
      .map((p) => ({ id: p.id, move: botMove(s, p.id, settings, Math.random) }))
      .filter((m): m is { id: string; move: GameAction } => m.move !== null);
    if (!moves.length) return;
    // En nomination, on laisse le temps à l'humain de se porter volontaire.
    const chosen = moves[Math.floor(Math.random() * moves.length)];
    const rev = game.rev;
    const t = setTimeout(() => {
      if (gameRef.current.rev !== rev) return;
      dispatch(chosen.id, chosen.move);
      if (chosen.move.type === "done" && settings.chatParticipants && Math.random() < 0.45) {
        const st = gameRef.current.state;
        if (st && isParticipant(st, chosen.id)) {
          const bot = st.players.find((p) => p.id === chosen.id);
          pushMessage({ userId: chosen.id, name: bot?.name ?? "Bot", channel: "participants", body: botBluff(Math.random) });
        }
      }
    }, botDelay(chosen.move, Math.random));
    return () => clearTimeout(t);
  }, [game, perspective, settings, dispatch, paused, pushMessage]);

  const gameAction = useCallback(
    async (action: GameAction, opts?: { silent?: boolean }) => {
      const err = dispatch(perspective, action);
      if (err && !opts?.silent) setError(err);
      return !err;
    },
    [dispatch, perspective],
  );

  const roomAction = useCallback(
    async (action: RoomAction) => {
      switch (action.type) {
        case "start": {
          const players = members.filter((m) => m.role === "player");
          if (players.length < MIN_PLAYERS) {
            setError(`Il faut au moins ${MIN_PLAYERS} joueurs.`);
            return false;
          }
          const { state, secret } = createGame(
            players.map((p) => ({ id: p.id, name: p.name, avatar: p.avatar })),
            { now: Date.now(), rng: Math.random, settings },
          );
          commit({ status: "playing", state, secret, knowledge: [], rev: gameRef.current.rev + 1 });
          return true;
        }
        case "settings":
          setSettings(action.settings);
          if (action.settings.maxPlayers - 1 < botCount) resize(action.settings.maxPlayers - 1);
          return true;
        case "back_to_lobby":
          commit({ ...emptyGame(), rev: gameRef.current.rev + 1 });
          setPerspective(DEMO_HUMAN_ID);
          return true;
        case "kick":
          setMembers((prev) => prev.filter((m) => m.id !== action.userId));
          return true;
        default:
          return true;
      }
    },
    [members, settings, botCount, resize, commit],
  );

  const sendChat = useCallback(
    async (channel: ChatMessage["channel"], body: string) => {
      const me = members.find((m) => m.id === perspective);
      pushMessage({ userId: perspective, name: me?.name ?? "Toi", channel, body });
      return true;
    },
    [members, perspective, pushMessage],
  );

  const me = members.find((m) => m.id === perspective) ?? members[0];
  const round = game.state?.round ?? 0;

  const view = useMemo<RoomView>(
    () => ({
      mode: "demo",
      code: "DEMO",
      me: { id: me.id, name: me.name, avatar: me.avatar },
      hostId: me.id,
      status: game.status,
      settings,
      state: game.state,
      members,
      knowledge: game.knowledge.filter((k) => k.userId === me.id && k.round === round),
      messages: messages.filter((m) => {
        if (m.channel === "global") return true;
        const s = game.state;
        return !!s && isParticipant(s, me.id);
      }),
      pending: false,
      error,
      clearError: () => setError(null),
      gameAction,
      roomAction,
      sendChat,
      leave: async () => {},
    }),
    [me, game, settings, members, round, messages, error, gameAction, roomAction, sendChat],
  );

  return { view, perspective, setPerspective, botCount, setBotCount: resize, paused, setPaused };
}
