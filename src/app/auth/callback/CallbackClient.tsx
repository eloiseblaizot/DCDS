"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { CenterMessage, Loading } from "@/components/room/RoomScreen";

/** Retour de Discord : supabase-js échange le code tout seul, on redirige ensuite. */
export function CallbackClient() {
  const router = useRouter();
  const params = useSearchParams();
  const { ready, session } = useAuth();
  const next = params.get("next");
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
  const failed = params.get("error_description");

  useEffect(() => {
    if (ready && session) router.replace(safeNext);
  }, [ready, session, router, safeNext]);

  if (failed) {
    return (
      <CenterMessage>
        <div className="clay max-w-md p-8 text-center">
          <p className="text-xl font-bold">Connexion Discord annulée</p>
          <p className="mt-2 text-ink-soft">{failed}</p>
          <Link href={safeNext} className="clay-btn mt-5">
            Revenir
          </Link>
        </div>
      </CenterMessage>
    );
  }
  return <Loading text="Connexion à Discord…" />;
}
