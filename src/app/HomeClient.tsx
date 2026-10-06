"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ClayCloud } from "@/components/art/ClayCloud";
import { ContainerArt } from "@/components/art/ContainerArt";
import { useAuth } from "@/components/auth/AuthProvider";
import { DiscordIcon, IdentityCard } from "@/components/auth/IdentityCard";
import { Avatar } from "@/components/game/PlayerTile";
import { Modal } from "@/components/ui/Modal";
import { api } from "@/lib/client/supabase";
import { DEFAULT_SETTINGS, JOKER_ORDER, JOKERS } from "@/lib/game/settings";

interface PublicRoom {
  code: string;
  host_name: string;
  players: number;
  max_players: number;
  status: "lobby" | "playing";
}

function IdentityBar() {
  const { identity, signOut, signInWithDiscord, rename, configured } = useAuth();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  if (!configured || !identity) return null;
  return (
    <div className="clay flex flex-wrap items-center gap-3 px-4 py-2.5">
      <Avatar id={identity.id} name={identity.name} avatar={identity.avatar} className="h-10 w-10 text-lg" />
      {editing ? (
        <form
          className="flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            await rename(name);
            setEditing(false);
          }}
        >
          <input className="clay-input py-1.5" value={name} maxLength={24} onChange={(e) => setName(e.target.value)} autoFocus aria-label="Nouveau pseudo" />
          <button className="clay-btn sm">OK</button>
        </form>
      ) : (
        <div>
          <p className="font-bold leading-tight">{identity.name}</p>
          <p className="text-xs text-ink-soft">{identity.isGuest ? "Invité" : "Connecté avec Discord"}</p>
        </div>
      )}
      <div className="ml-auto flex gap-2">
        {!editing && (
          <button
            type="button"
            className="clay-btn sm light"
            onClick={() => {
              setName(identity.name);
              setEditing(true);
            }}
          >
            ✏️ Pseudo
          </button>
        )}
        {identity.isGuest ? (
          <button type="button" className="clay-btn sm discord" onClick={() => signInWithDiscord("/")}>
            <DiscordIcon /> Discord
          </button>
        ) : (
          <button type="button" className="clay-btn sm light" onClick={() => signOut()}>
            Déconnexion
          </button>
        )}
      </div>
    </div>
  );
}

function PublicRooms() {
  const { configured } = useAuth();
  const [rooms, setRooms] = useState<PublicRoom[] | null>(null);
  useEffect(() => {
    if (!configured) return;
    let alive = true;
    const load = () =>
      api<{ rooms: PublicRoom[] }>("/api/rooms/public", undefined, "GET")
        .then((r) => alive && setRooms(r.rooms))
        .catch(() => alive && setRooms([]));
    void load();
    const iv = setInterval(load, 10_000);
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, [configured]);

  if (!configured) return null;
  return (
    <section className="clay clay-grain w-full p-5 sm:p-6">
      <h2 className="text-2xl font-bold">🌍 Parties publiques</h2>
      {rooms === null ? (
        <p className="mt-3 text-ink-soft">Chargement…</p>
      ) : rooms.length === 0 ? (
        <p className="mt-3 text-ink-soft">Aucune partie publique pour l&apos;instant. Crée la tienne !</p>
      ) : (
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {rooms.map((r) => (
            <li key={r.code}>
              <Link href={`/r/${r.code}`} className="clay-sunken flex items-center gap-3 p-3 transition hover:brightness-95">
                <ContainerArt color="#5496ff" className="w-14 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold">Salon de {r.host_name}</span>
                  <span className="block text-sm text-ink-soft">
                    {r.players}/{r.max_players} joueurs · {r.status === "lobby" ? "en attente" : "en cours"}
                  </span>
                </span>
                <span className="clay-btn sm">{r.status === "lobby" && r.players < r.max_players ? "Rejoindre" : "Regarder"}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function HomeClient() {
  const router = useRouter();
  const { identity, configured, ready } = useAuth();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [askIdentity, setAskIdentity] = useState<null | (() => void)>(null);

  const withIdentity = (fn: () => void) => {
    if (identity) fn();
    else setAskIdentity(() => fn);
  };

  const create = (isPublic: boolean) =>
    withIdentity(async () => {
      setBusy(true);
      setError(null);
      try {
        const { code } = await api<{ code: string }>("/api/rooms", { settings: { ...DEFAULT_SETTINGS, isPublic } });
        router.push(`/r/${code}`);
      } catch (err) {
        setError((err as Error).message);
        setBusy(false);
      }
    });

  const join = (e: React.FormEvent) => {
    e.preventDefault();
    const c = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (c) router.push(`/r/${c}`);
  };

  return (
    <div className="mt-10 flex w-full flex-col gap-6">
      {ready && <IdentityBar />}

      {!configured && ready && (
        <div className="clay p-5 text-center">
          <p className="font-bold">Le jeu en ligne n&apos;est pas encore branché sur ce serveur.</p>
          <p className="text-sm text-ink-soft">En attendant, teste tout le jeu en solo contre des bots.</p>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <section className="clay clay-grain flex flex-col p-6">
          <div className="-mt-14 mb-2 flex justify-center">
            <ContainerArt color="#ff54ff" number="?" className="w-36 animate-float" />
          </div>
          <h2 className="text-2xl font-bold">Créer une partie</h2>
          <p className="mt-1 text-ink-soft">De 4 à 12 joueurs, webcam ou micro au choix. Tu règles tout dans le salon.</p>
          <div className="mt-auto flex flex-wrap gap-2 pt-5">
            <button type="button" className="clay-btn yellow flex-1" disabled={busy || !configured} onClick={() => create(false)}>
              🔒 Partie privée
            </button>
            <button type="button" className="clay-btn flex-1" disabled={busy || !configured} onClick={() => create(true)}>
              🌍 Partie publique
            </button>
          </div>
        </section>

        <section className="clay clay-grain flex flex-col p-6">
          <div className="-mt-14 mb-2 flex justify-center">
            <ContainerArt color="#4bf525" number="#" className="w-36 animate-float [animation-delay:-2s]" />
          </div>
          <h2 className="text-2xl font-bold">Rejoindre avec un code</h2>
          <p className="mt-1 text-ink-soft">Un ami t&apos;a donné un code ? Tape-le ici, ou clique simplement sur son lien.</p>
          <form onSubmit={join} className="mt-auto flex gap-2 pt-5">
            <input
              className="clay-input text-center font-mono text-xl uppercase tracking-[0.25em]"
              placeholder="ABC123"
              value={code}
              maxLength={8}
              onChange={(e) => setCode(e.target.value)}
              aria-label="Code du salon"
            />
            <button className="clay-btn green shrink-0" disabled={!code.trim() || !configured}>
              Go !
            </button>
          </form>
        </section>
      </div>

      {error && <p className="clay p-3 text-center font-bold text-clay-red">{error}</p>}

      <PublicRooms />

      <section className="clay clay-grain w-full p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-2xl font-bold">☁️ Les jokers du décideur</h2>
          <Link href="/regles" className="clay-btn sm light">
            Toutes les règles
          </Link>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {JOKER_ORDER.map((k) => (
            <div key={k} className="text-center">
              <ClayCloud variant={k} className="mx-auto h-24 w-32" />
              <p className="font-bold">{JOKERS[k].name}</p>
              <p className="text-xs text-ink-soft">{JOKERS[k].description}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="text-center">
        <Link href="/demo" className="clay-btn orange lg">
          🧪 Essayer en solo contre des bots
        </Link>
      </div>

      <Modal open={!!askIdentity} onClose={() => setAskIdentity(null)} title="Choisis ton pseudo">
        <IdentityCard
          bare
          onDone={() => {
            const fn = askIdentity;
            setAskIdentity(null);
            fn?.();
          }}
        />
      </Modal>
    </div>
  );
}
