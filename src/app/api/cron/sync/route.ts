import { runSync } from "@/lib/sync/run";

export const maxDuration = 300;

async function handle(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (secret) {
    const header = request.headers.get("authorization");
    if (header !== `Bearer ${secret}`) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
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
