import { readCatalogBlob, readCatalogFile, publishSnapshot, writeCatalogFiles } from "@/lib/catalog-store";
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
import { buildFreshness } from "@/lib/source-freshness";
import { publicSources, readPublicSyncStatus, savePublicSyncStatus, snapshotIsLive, syncSummaryLine } from "@/lib/sync-status";

function isEmulator(id: string): id is EmulatorId {
  return (EMULATOR_IDS as readonly string[]).includes(id);
}

export async function runSync(): Promise<SyncReport> {
  const started = new Date();
  const previous = (await readCatalogBlob()) ?? readCatalogFile();
  const previousStatus = await readPublicSyncStatus();
  await savePublicSyncStatus({
    generatedAt: previous?.generatedAt ?? null,
    lastSyncAttemptAt: started.toISOString(),
    lastSyncOk: false,
    gameCount: previous?.games.length ?? null,
    sources: previousStatus.sources,
  });
  console.log("PlayableYet sync started");

  try {
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
    const { catalog: assembled, changes } = assembleCatalog(reports, titles.titles, previous, generatedAt);
    const freshness = buildFreshness({
      fetched: [...fetched.map((source) => source.meta), titles.meta],
      previousCatalog: previous,
      previousStatus,
      generatedAt,
    });
    const catalog = { ...assembled, sources: freshness };
    const index = toSearchIndex(catalog);
    const sources = [...fetched.map((source) => source.meta), titles.meta];
    const local = writeCatalogFiles(catalog, index, {
      startedAt: started.toISOString(),
      finishedAt: started.toISOString(),
      durationMs: 0,
      games: catalog.games.length,
      reports: 0,
      changes,
      notificationsSent: 0,
      notificationsSkipped: 0,
      persisted: [],
      sources,
    });
    const blobs = await publishSnapshot(catalog, index);
    const persisted = [...local, ...blobs];
    const requiredFailed = sources.some((source) => ["rpcs3", "shadps4", "sharpemu"].includes(source.id) && !source.ok);
    const published = snapshotIsLive(persisted);
    const ok = published && !requiredFailed;

    let notifications = { sent: 0, skipped: 0 };
    try {
      notifications = await notifyPlayable(catalog, generatedAt.slice(0, 10));
    } catch {
      console.log("PlayableYet sync notify failed");
    }

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
      persisted,
      sources,
    };
    writeCatalogFiles(catalog, index, report);
    await savePublicSyncStatus({
      generatedAt: catalog.generatedAt,
      lastSyncAttemptAt: started.toISOString(),
      lastSyncOk: ok,
      gameCount: catalog.games.length,
      sources: freshness,
    });
    console.log(
      syncSummaryLine({
        ok,
        games: catalog.games.length,
        generatedAt: catalog.generatedAt,
        sources: publicSources(sources),
        persisted,
        reason: ok ? undefined : published ? "fetch-failed" : "blob-unavailable",
      }),
    );
    return report;
  } catch (error) {
    console.log(
      syncSummaryLine({
        ok: false,
        games: previous?.games.length ?? null,
        generatedAt: previous?.generatedAt ?? null,
        sources: [],
        persisted: [],
        reason: "exception",
      }),
    );
    throw error;
  }
}
