"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { RoomAction } from "@/lib/game/actions";
import { normalizeSettings } from "@/lib/game/settings";
import type { GameAction, GameState, KnowledgeEntry, Lot, RoomSettings } from "@/lib/game/types";
import type { Identity } from "@/lib/identity";
import { api, supabaseBrowser } from "./supabase";
import type { ChatMessage, MemberView, RoomStatus, RoomView } from "./roomView";

interface RoomRow {
  id: string;
  code: string;
  host_id: string;
  status: RoomStatus;
  settings: RoomSettings;
  state: GameState | null;
  version: number;
  members_rev: number;
}

interface MessageRow {
  id: number;
  user_id: string | null;
  name: string;
  channel: "global" | "participants";
  body: string;
  created_at: string;
}

const toMessage = (m: MessageRow): ChatMessage => ({
  id: m.id,
  userId: m.user_id,
  name: m.name,
  channel: m.channel,
  body: m.body,
  at: new Date(m.created_at).getTime(),
});

export type OnlineRoomResult =
  | { kind: "loading" }
  | { kind: "fatal"; message: string }
  | { kind: "ready"; view: RoomView };

/** Salon en ligne : rejoint, charge l'état et reste synchronisé en temps réel. */
export function useOnlineRoom(code: string, identity: Identity | null): OnlineRoomResult {
  const sb = supabaseBrowser();
  const [roomId, setRoomId] = useState<string | null>(null);
  const [room, setRoom] = useState<RoomRow | null>(null);
  const [members, setMembers] = useState<Omit<MemberView, "online">[]>([]);
  const [online, setOnline] = useState<Set<string>>(new Set());
  const [knowledge, setKnowledge] = useState<KnowledgeEntry[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [fatal, setFatal] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const meId = identity?.id ?? null;

  /** Relit la ligne du salon (l'événement temps réel ne sert que de signal). */
  const refreshRoom = useCallback(async () => {
    if (!sb || !roomId) return;
    const { data, error } = await sb
      .from("rooms")
      .select("id, code, host_id, status, settings, state, version, members_rev")
      .eq("id", roomId)
      .maybeSingle();
    if (error) return;
    if (!data) {
      setFatal("Tu ne fais plus partie de ce salon (expulsé ou salon fermé).");
      return;
    }
    const row = data as RoomRow;
    setRoom((prev) =>
      prev && (prev.version > row.version || (prev.version === row.version && prev.members_rev > row.members_rev)) ? prev : row,
    );
  }, [sb, roomId]);

  // 1. Rejoindre le salon (ou mettre à jour son pseudo).
  useEffect(() => {
    if (!identity) return;
    let cancelled = false;
    api<{ roomId: string }>(`/api/rooms/${code}/join`, {})
      .then(({ roomId }) => !cancelled && setRoomId(roomId))
      .catch((err: Error) => !cancelled && setFatal(err.message));
    return () => {
      cancelled = true;
    };
  }, [code, identity]);

  // 2. Charger + s'abonner aux changements.
  useEffect(() => {
    if (!sb || !roomId || !meId) return;
    let alive = true;

    const fetchMessages = async () => {
      const { data } = await sb
        .from("messages")
        .select("id, user_id, name, channel, body, created_at")
        .eq("room_id", roomId)
        .order("id", { ascending: false })
        .limit(120);
      if (alive && data) setMessages((data as MessageRow[]).reverse().map(toMessage));
    };

    const channel = sb
      .channel(`room-${roomId}`, { config: { presence: { key: meId } } })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "rooms", filter: `id=eq.${roomId}` }, () => {
        void refreshRoom();
      })
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "player_knowledge", filter: `room_id=eq.${roomId}` },
        (payload) => {
          const k = payload.new as { user_id: string; round: number; container_id: number; lot: Lot };
          if (k.user_id !== meId) return;
          setKnowledge((prev) => [...prev, { userId: k.user_id, round: k.round, containerId: k.container_id, lot: k.lot }]);
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `room_id=eq.${roomId}` },
        (payload) => {
          const m = toMessage(payload.new as MessageRow);
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev.slice(-200), m]));
        },
      )
      .on("presence", { event: "sync" }, () => {
        setOnline(new Set(Object.keys(channel.presenceState())));
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          void channel.track({ at: Date.now() });
          void refreshRoom();
          void fetchMessages();
        }
      });

    // Premier chargement sans attendre l'abonnement temps réel, puis filet de sécurité régulier.
    const first = setTimeout(() => {
      void refreshRoom();
      void fetchMessages();
    }, 0);
    const poll = setInterval(() => void refreshRoom(), 15_000);
    const onVisible = () => document.visibilityState === "visible" && void refreshRoom();
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      alive = false;
      clearTimeout(first);
      clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisible);
      void sb.removeChannel(channel);
    };
  }, [sb, roomId, meId, refreshRoom]);

  // 3. Membres : rechargés quand la liste change.
  const membersRev = room?.members_rev;
  const hostId = room?.host_id;
  useEffect(() => {
    if (!sb || !roomId || membersRev === undefined) return;
    let alive = true;
    sb.from("room_members")
      .select("user_id, name, avatar_url, role, joined_at")
      .eq("room_id", roomId)
      .order("joined_at", { ascending: true })
      .then(({ data }) => {
        if (!alive || !data) return;
        setMembers(
          data.map((m) => ({
            id: m.user_id as string,
            name: m.name as string,
            avatar: (m.avatar_url as string | null) ?? null,
            role: m.role as "player" | "spectator",
          })),
        );
      });
    return () => {
      alive = false;
    };
  }, [sb, roomId, membersRev, hostId]);

  // 4. Mes infos secrètes : rechargées à chaque nouvelle manche / partie.
  const knowledgeKey = `${room?.status}-${room?.state?.round ?? 0}-${room?.state?.players.length ?? 0}`;
  useEffect(() => {
    if (!sb || !roomId || !meId) return;
    let alive = true;
    sb.from("player_knowledge")
      .select("user_id, round, container_id, lot")
      .eq("room_id", roomId)
      .eq("user_id", meId)
      .then(({ data }) => {
        if (!alive || !data) return;
        setKnowledge(
          data.map((k) => ({
            userId: k.user_id as string,
            round: k.round as number,
            containerId: k.container_id as number,
            lot: k.lot as Lot,
          })),
        );
      });
    return () => {
      alive = false;
    };
  }, [sb, roomId, meId, knowledgeKey]);

  const run = useCallback(async (fn: () => Promise<unknown>, silent = false) => {
    setPending(true);
    try {
      await fn();
      await refreshRoom();
      return true;
    } catch (err) {
      if (!silent) setError((err as Error).message);
      return false;
    } finally {
      setPending(false);
    }
  }, [refreshRoom]);

  const gameAction = useCallback(
    (action: GameAction, opts?: { silent?: boolean }) =>
      run(() => api(`/api/rooms/${code}/action`, { kind: "game", action }), opts?.silent),
    [run, code],
  );
  const roomAction = useCallback(
    (action: RoomAction) => run(() => api(`/api/rooms/${code}/action`, { kind: "room", action })),
    [run, code],
  );
  const sendChat = useCallback(
    async (channel: ChatMessage["channel"], body: string) => {
      try {
        await api(`/api/rooms/${code}/chat`, { channel, body });
        return true;
      } catch (err) {
        setError((err as Error).message);
        return false;
      }
    },
    [code],
  );
  const leave = useCallback(async () => {
    await api(`/api/rooms/${code}/leave`, {}).catch(() => {});
  }, [code]);
  const clearError = useCallback(() => setError(null), []);

  const view = useMemo<RoomView | null>(() => {
    if (!room || !identity) return null;
    const round = room.state?.round ?? 0;
    return {
      mode: "online",
      code: room.code,
      me: { id: identity.id, name: identity.name, avatar: identity.avatar },
      hostId: room.host_id,
      status: room.status,
      settings: normalizeSettings(room.settings),
      state: room.status === "lobby" ? null : room.state,
      members: members.map((m) => ({ ...m, online: online.has(m.id) })),
      knowledge: room.status === "lobby" ? [] : knowledge.filter((k) => k.round === round),
      messages,
      pending,
      error,
      clearError,
      gameAction,
      roomAction,
      sendChat,
      leave,
    };
  }, [room, identity, members, online, knowledge, messages, pending, error, clearError, gameAction, roomAction, sendChat, leave]);

  if (fatal) return { kind: "fatal", message: fatal };
  if (!view) return { kind: "loading" };
  return { kind: "ready", view };
}
