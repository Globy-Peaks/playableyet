import { revalidateTag } from "next/cache";
import { authorizeCron } from "@/lib/cron-auth";
import { CATALOG_CACHE_TAG } from "@/lib/catalog-tag";
import { runSync } from "@/lib/sync/run";
import { snapshotIsLive } from "@/lib/sync-status";

export const maxDuration = 300;

function safeError(error: unknown): string {
  const message = error instanceof Error ? error.message : "Sync failed";
  return message.replace(/Bearer\s+\S+/gi, "Bearer [redacted]").slice(0, 180);
}

async function handle(request: Request) {
  const denied = authorizeCron(request, process.env);
  if (denied) return denied;
  try {
    const report = await runSync();
    const required = ["rpcs3", "shadps4", "sharpemu"];
    const failed = report.sources.filter((source) => required.includes(source.id) && !source.ok);
    const published = snapshotIsLive(report.persisted);
    if (published) {
      try {
        revalidateTag(CATALOG_CACHE_TAG, { expire: 0 });
      } catch {
        console.log("PlayableYet sync revalidate failed");
      }
    }
    if (!published || failed.length) return Response.json(report, { status: 502 });
    return Response.json(report);
  } catch (error) {
    return Response.json({ error: safeError(error) }, { status: 500 });
  }
}

export function GET(request: Request) {
  return handle(request);
}

export function POST(request: Request) {
  return handle(request);
}
