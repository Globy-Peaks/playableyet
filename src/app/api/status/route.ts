import { connection } from "next/server";
import { loadCatalog } from "@/lib/catalog";
import { explainSources } from "@/lib/source-freshness";
import { readPublicSyncStatus } from "@/lib/sync-status";

export async function GET() {
  await connection();
  const [status, catalog] = await Promise.all([readPublicSyncStatus(), loadCatalog()]);
  return Response.json(
    { ...status, sources: explainSources(status, catalog) },
    { headers: { "Cache-Control": "public, max-age=60" } },
  );
}
