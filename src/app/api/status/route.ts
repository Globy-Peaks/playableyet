import { connection } from "next/server";
import { readPublicSyncStatus } from "@/lib/sync-status";

export async function GET() {
  await connection();
  const status = await readPublicSyncStatus();
  return Response.json(status, {
    headers: { "Cache-Control": "public, max-age=60" },
  });
}
