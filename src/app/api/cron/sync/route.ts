import { authorizeCron } from "@/lib/cron-auth";
import { runSync } from "@/lib/sync/run";

export const maxDuration = 300;

async function handle(request: Request) {
  const denied = authorizeCron(request, process.env);
  if (denied) return denied;
  try {
    const report = await runSync();
    const required = ["rpcs3", "shadps4", "sharpemu"];
    const failed = report.sources.filter((source) => required.includes(source.id) && !source.ok);
    return Response.json(report, { status: failed.length ? 502 : 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed";
    return Response.json({ error: message }, { status: 500 });
  }
}

export function GET(request: Request) {
  return handle(request);
}

export function POST(request: Request) {
  return handle(request);
}
