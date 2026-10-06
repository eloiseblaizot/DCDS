import { connection } from "next/server";
import { route } from "@/lib/server/http";
import { rpcError } from "@/lib/server/rooms";
import { supabaseAdmin } from "@/lib/server/supabase";

const listPublicRooms = route(async () => {
  const { data, error } = await supabaseAdmin().rpc("list_public_rooms");
  if (error) throw rpcError(error);
  return { rooms: data ?? [] };
});

/** Liste des parties publiques (en attente ou en cours). Toujours calculée à la demande. */
export async function GET() {
  await connection();
  return listPublicRooms();
}
