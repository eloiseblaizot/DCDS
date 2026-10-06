import { Suspense } from "react";
import { Loading } from "@/components/room/RoomScreen";
import { RoomClient } from "./RoomClient";

export default function RoomPage() {
  return (
    <Suspense fallback={<Loading />}>
      <RoomClient />
    </Suspense>
  );
}
