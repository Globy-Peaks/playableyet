import { readFileSync } from "node:fs";
import { EMULATORS } from "@/lib/emulators";
import { syncMetaPath } from "@/lib/paths";
import type { Catalog, EmulatorId, SourceFreshness, SourceReport, SyncReport } from "@/lib/types";
import { EMULATOR_IDS } from "@/lib/types";
import type { PublicSyncStatus } from "@/lib/sync-status";

const SOURCE_LABEL: Record<string, string> = {
  ...Object.fromEntries(EMULATOR_IDS.map((id) => [id, EMULATORS[id].name])),
  "playstation-titles": "PlayStation-Titles",
};

export function isEmulatorId(id: string): id is EmulatorId {
  return (EMULATOR_IDS as readonly string[]).includes(id);
}

export function countEmulatorReports(catalog: Catalog | null, id: EmulatorId): number {
  if (!catalog) return 0;
  let count = 0;
  for (const game of catalog.games) {
    for (const report of game.reports) {
      if (report.emulator === id) count += 1;
    }
  }
  return count;
}

/**
 * Last recorded successful fetch for a carried count.
 * Used when a status blob was written before asOf existed.
 * A different count is a different snapshot, so that timestamp is not reused.
 */
export function asOfFromSyncReport(
  id: string,
  carriedCount: number,
  report: Pick<SyncReport, "finishedAt" | "sources"> | null,
): string | null {
  if (!report || carriedCount <= 0) return null;
  const source = report.sources.find((item) => item.id === id);
  if (!source?.ok || source.count !== carriedCount || !report.finishedAt) return null;
  return report.finishedAt;
}

function readSyncReport(): Pick<SyncReport, "finishedAt" | "sources"> | null {
  try {
    const parsed = JSON.parse(readFileSync(syncMetaPath, "utf8")) as SyncReport;
    if (!parsed || typeof parsed.finishedAt !== "string" || !Array.isArray(parsed.sources)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function buildFreshness(input: {
  fetched: SourceReport[];
  previousCatalog: Catalog | null;
  previousStatus: PublicSyncStatus;
  generatedAt: string;
}): SourceFreshness[] {
  const recorded = readSyncReport();
  return input.fetched.map((meta) => {
    if (meta.ok) {
      return { id: meta.id, ok: true, count: meta.count, asOf: input.generatedAt, carried: false };
    }
    const prior = input.previousStatus.sources.find((source) => source.id === meta.id);
    const stored = input.previousCatalog?.sources?.find((source) => source.id === meta.id);
    const kept = isEmulatorId(meta.id)
      ? countEmulatorReports(input.previousCatalog, meta.id)
      : prior && prior.count > 0
        ? prior.count
        : 0;
    const asOf =
      stored?.asOf ??
      prior?.asOf ??
      (prior?.ok ? input.previousCatalog?.generatedAt ?? null : null) ??
      asOfFromSyncReport(meta.id, kept, recorded);
    return { id: meta.id, ok: false, count: kept, asOf, carried: kept > 0 };
  });
}

/**
 * Fill asOf and kept counts for a status blob written before those fields existed.
 * A failed source with reports still in the catalog is carried. asOf is the last
 * stored success, or the committed sync report when that fetch had the same count.
 */
export function explainSources(status: PublicSyncStatus, catalog: Catalog): SourceFreshness[] {
  const recorded = readSyncReport();
  return status.sources.map((source) => {
    if (source.ok) {
      return {
        id: source.id,
        ok: true,
        count: source.count,
        asOf: source.asOf ?? status.generatedAt,
        carried: false,
      };
    }
    const kept = isEmulatorId(source.id) ? countEmulatorReports(catalog, source.id) : source.count;
    const count = source.count > 0 ? source.count : kept;
    return {
      id: source.id,
      ok: false,
      count,
      asOf: source.asOf ?? asOfFromSyncReport(source.id, count, recorded),
      carried: source.carried || count > 0,
    };
  });
}

export function formatStamp(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return `${value} UTC`;
  return `${value.slice(0, 16).replace("T", " ")} UTC`;
}

export function staleSourceMessages(
  sources: SourceFreshness[],
  snapshotAt: string,
): { id: string; message: string }[] {
  const messages: { id: string; message: string }[] = [];
  const snapshot = formatStamp(snapshotAt);
  for (const source of sources) {
    if (source.ok) continue;
    const name = SOURCE_LABEL[source.id] ?? source.id;
    if (source.id === "playstation-titles") {
      messages.push({
        id: source.id,
        message: `${name} could not be read for this snapshot. Names already stored on each game were kept.`,
      });
      continue;
    }
    if (source.carried && source.count > 0) {
      const when = source.asOf
        ? `the last successful fetch at ${formatStamp(source.asOf)}`
        : "an earlier fetch whose time was not recorded";
      const kept = source.count === 1 ? "1 report is" : `${source.count.toLocaleString()} reports are`;
      messages.push({
        id: source.id,
        message: `${name} could not be read for this snapshot. ${kept} kept from ${when}. That data is older than the snapshot from ${snapshot}.`,
      });
      continue;
    }
    messages.push({
      id: source.id,
      message: `${name} could not be read for this snapshot, and no earlier reports were kept.`,
    });
  }
  return messages;
}
