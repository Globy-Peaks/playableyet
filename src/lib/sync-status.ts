import { readCatalogFile, readPublicBlobJson, tryWriteJson, writePublicBlob } from "@/lib/catalog-store";
import { BLOB_CATALOG, BLOB_SYNC_STATUS, syncStatusPath } from "@/lib/paths";
import type { SourceFreshness, SourceReport } from "@/lib/types";

export type PublicSourceStatus = SourceFreshness;

export type PublicSyncStatus = {
  generatedAt: string | null;
  lastSyncAttemptAt: string | null;
  lastSyncOk: boolean | null;
  gameCount: number | null;
  sources: PublicSourceStatus[];
};

export function publicSources(sources: SourceReport[]): PublicSourceStatus[] {
  return sources.map((source) => ({
    id: source.id,
    ok: source.ok,
    count: source.count,
    asOf: null,
    carried: false,
  }));
}

export function parsePublicSyncStatus(value: unknown): PublicSyncStatus | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const sources = Array.isArray(record.sources)
    ? record.sources.flatMap((item) => {
        if (!item || typeof item !== "object") return [];
        const source = item as Record<string, unknown>;
        if (typeof source.id !== "string" || typeof source.ok !== "boolean" || typeof source.count !== "number") {
          return [];
        }
        return [
          {
            id: source.id,
            ok: source.ok,
            count: source.count,
            asOf: typeof source.asOf === "string" ? source.asOf : null,
            carried: source.carried === true,
          },
        ];
      })
    : [];
  return {
    generatedAt: typeof record.generatedAt === "string" ? record.generatedAt : null,
    lastSyncAttemptAt: typeof record.lastSyncAttemptAt === "string" ? record.lastSyncAttemptAt : null,
    lastSyncOk: typeof record.lastSyncOk === "boolean" ? record.lastSyncOk : null,
    gameCount: typeof record.gameCount === "number" ? record.gameCount : null,
    sources,
  };
}

export function syncSummaryLine(input: {
  ok: boolean;
  games: number | null;
  generatedAt: string | null;
  sources: { id: string; ok: boolean }[];
  persisted: string[];
  reason?: string;
}): string {
  const sources = input.sources.map((source) => `${source.id}:${source.ok ? "ok" : "failed"}`).join(",") || "none";
  const persisted = input.persisted.join(",") || "none";
  const reason = input.reason ? ` reason=${input.reason}` : "";
  return `PlayableYet sync summary ok=${input.ok} games=${input.games ?? 0} generatedAt=${input.generatedAt ?? "none"} sources=${sources} persisted=${persisted}${reason}`;
}

export function snapshotIsLive(persisted: string[]): boolean {
  const catalogBlob = persisted.includes(`blob:${BLOB_CATALOG}`);
  const local = persisted.includes("data/catalog.json");
  if (process.env.VERCEL === "1") return catalogBlob;
  return catalogBlob || local;
}

export async function savePublicSyncStatus(status: PublicSyncStatus): Promise<string[]> {
  const body = JSON.stringify(parsePublicSyncStatus(status) ?? status);
  const persisted: string[] = [];
  if (tryWriteJson(syncStatusPath, JSON.parse(body) as PublicSyncStatus)) persisted.push("data/sync-status.json");
  if (await writePublicBlob(BLOB_SYNC_STATUS, body)) persisted.push(`blob:${BLOB_SYNC_STATUS}`);
  return persisted;
}

export async function readPublicSyncStatus(): Promise<PublicSyncStatus> {
  const fromBlob = parsePublicSyncStatus(await readPublicBlobJson(BLOB_SYNC_STATUS));
  if (fromBlob) return fromBlob;
  try {
    const { readFileSync } = await import("node:fs");
    const fromFile = parsePublicSyncStatus(JSON.parse(readFileSync(syncStatusPath, "utf8")) as unknown);
    if (fromFile) return fromFile;
  } catch {
    // No recorded sync yet.
  }
  const catalog = readCatalogFile();
  return {
    generatedAt: catalog?.generatedAt ?? null,
    lastSyncAttemptAt: null,
    lastSyncOk: null,
    gameCount: catalog?.games.length ?? null,
    sources: [],
  };
}
