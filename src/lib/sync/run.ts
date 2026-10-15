import { readCatalogFile, publishSnapshot, writeCatalogFiles } from "@/lib/catalog-store";
import { notifyPlayable } from "@/lib/notify";
import type { EmulatorId, SyncReport } from "@/lib/types";
import { EMULATOR_IDS } from "@/lib/types";
import { assembleCatalog, carryForward, toSearchIndex } from "@/lib/sync/assemble";
import {
  dedupeReports,
  fetchAnyPs5,
  fetchFpPs4,
  fetchKyty,
  fetchRpcs3,
  fetchShadPs4,
  fetchSharpEmu,
  fetchTitleIndex,
} from "@/lib/sync/fetchers";

function isEmulator(id: string): id is EmulatorId {
  return (EMULATOR_IDS as readonly string[]).includes(id);
}

export async function runSync(): Promise<SyncReport> {
  const started = new Date();
  console.log("PlayableYet sync started");
  const previous = readCatalogFile();
  const [rpcs3, shadps4, fpps4, sharpemu, kytyps5, anyps5, titles] = await Promise.all([
    fetchRpcs3(),
    fetchShadPs4(),
    fetchFpPs4(),
    fetchSharpEmu(),
    fetchKyty(),
    fetchAnyPs5(),
    fetchTitleIndex(),
  ]);
  const fetched = [rpcs3, shadps4, fpps4, sharpemu, kytyps5, anyps5];
  for (const source of fetched) {
    console.log(
      `${source.meta.id}: ${source.meta.ok ? "ok" : "failed"} ${source.meta.count}${source.meta.error ? ` (${source.meta.error})` : ""}`,
    );
  }
  console.log(`titles: ${titles.meta.ok ? titles.meta.count : titles.meta.error}`);

  const failed = fetched
    .map((source) => source.meta)
    .filter((meta) => !meta.ok && isEmulator(meta.id))
    .map((meta) => meta.id as EmulatorId);

  const reports = dedupeReports(
    carryForward(
      previous,
      failed,
      fetched.flatMap((source) => source.reports),
    ),
  );
  const generatedAt = started.toISOString();
  const { catalog, changes } = assembleCatalog(reports, titles.titles, previous, generatedAt);
  const index = toSearchIndex(catalog);
  const notifications = await notifyPlayable(catalog, generatedAt.slice(0, 10));
  const finished = new Date();
  const report: SyncReport = {
    startedAt: started.toISOString(),
    finishedAt: finished.toISOString(),
    durationMs: finished.getTime() - started.getTime(),
    games: catalog.games.length,
    reports: catalog.games.reduce((sum, game) => sum + game.reports.length, 0),
    changes,
    notificationsSent: notifications.sent,
    notificationsSkipped: notifications.skipped,
    persisted: [],
    sources: [...fetched.map((source) => source.meta), titles.meta],
  };
  writeCatalogFiles(catalog, index, report);
  report.persisted = await publishSnapshot(catalog, index);
  writeCatalogFiles(catalog, index, report);
  console.log(
    `sync finished: ${report.games} games, ${report.reports} reports, ${report.changes} status changes`,
  );
  return report;
}
