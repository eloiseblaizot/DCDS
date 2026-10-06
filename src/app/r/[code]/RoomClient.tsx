"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { IdentityCard } from "@/components/auth/IdentityCard";
import { LiveKitMedia } from "@/components/media/LiveKitMedia";
import { CenterMessage, Loading, RoomScreen } from "@/components/room/RoomScreen";
import { useOnlineRoom } from "@/lib/client/useOnlineRoom";
import type { Identity } from "@/lib/identity";

function OnlineRoom({ code, identity }: { code: string; identity: Identity }) {
  const res = useOnlineRoom(code, identity);
  if (res.kind === "loading") return <Loading />;
  if (res.kind === "fatal") {
    return (
      <CenterMessage>
        <div className="clay max-w-md p-8 text-center">
          <p className="text-5xl">🪳</p>
          <p className="mt-2 text-xl font-bold">{res.message}</p>
          <Link href="/" className="clay-btn mt-5">
            Retour à l&apos;accueil
          </Link>
        </div>
      </CenterMessage>
    );
  }
  const { view } = res;
  const me = view.members.find((m) => m.id === view.me.id);
  return (
    <LiveKitMedia code={view.code} settings={view.settings} canPublish={me?.role === "player"}>
      <RoomScreen view={view} />
    </LiveKitMedia>
  );
}

export function RoomClient() {
  const { code } = useParams<{ code: string }>();
  const { ready, configured, identity } = useAuth();

  if (!ready) return <Loading text="Connexion…" />;
  if (!configured || !identity) {
    return (
      <CenterMessage>
        <div className="w-full max-w-md pt-10">
          <IdentityCard title={`Rejoindre le salon ${code.toUpperCase()}`} />
          {!configured && (
            <p className="mt-4 text-center">
              <Link href="/demo" className="clay-btn yellow">
                Essayer le mode solo
              </Link>
            </p>
          )}
        </div>
      </CenterMessage>
    );
  }
  return <OnlineRoom code={code} identity={identity} />;
}
