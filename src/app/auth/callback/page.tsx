import { Suspense } from "react";
import { Loading } from "@/components/room/RoomScreen";
import { CallbackClient } from "./CallbackClient";

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<Loading text="Connexion à Discord…" />}>
      <CallbackClient />
    </Suspense>
  );
}
