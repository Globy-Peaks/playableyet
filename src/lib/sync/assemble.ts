import type { Catalog, Game, HistoryEvent, RawReport, Report, SearchEntry, TitleRef } from "@/lib/types";
import type { EmulatorId } from "@/lib/types";
import { cleanDisplayName, isUsefulTitle, normalizeName, slugifyName, UnionFind } from "@/lib/identity";
import { withCanonicalSlugs } from "@/lib/slugs";
import { bestStatus } from "@/lib/status";
import type { TitleInfo } from "@/lib/sync/fetchers";

const HISTORY_CAP = 40;

export function assembleCatalog(
  reports: RawReport[],
  titles: Map<string, TitleInfo>,
  previous: Catalog | null,
  generatedAt: string,
): { catalog: Catalog; changes: number } {
  const enriched = reports.map((report) => {
    const info = titles.get(report.titleId);
    return {
      ...report,
      name: report.name || info?.name,
      conceptId: report.conceptId || info?.conceptId,
    };
  });

  const ids = [...new Set(enriched.map((report) => report.titleId))];
  const groups = new UnionFind();
  for (const id of ids) groups.add(id);

  const byConcept = new Map<string, string[]>();
  const byName = new Map<string, string[]>();
  for (const report of enriched) {
    if (report.conceptId) {
      const conceptKey = `${report.platform}:${report.conceptId}`;
      const list = byConcept.get(conceptKey) ?? [];
      list.push(report.titleId);
      byConcept.set(conceptKey, list);
    }
    const key = normalizeName(report.name ?? "");
    if (key.length >= 4 && isUsefulTitle(report.name ?? "")) {
      const list = byName.get(key) ?? [];
      list.push(report.titleId);
      byName.set(key, list);
    }
  }
  for (const list of [...byConcept.values(), ...byName.values()]) {
    for (let index = 1; index < list.length; index += 1) groups.union(list[0], list[index]);
  }

  if (previous) {
    for (const game of previous.games) {
      const present = game.titles.map((title) => title.id).filter((id) => groups.has(id));
      for (let index = 1; index < present.length; index += 1) groups.union(present[0], present[index]);
    }
  }

  const buckets = new Map<string, RawReport[]>();
  for (const report of enriched) {
    const root = groups.find(report.titleId);
    const list = buckets.get(root) ?? [];
    list.push(report);
    buckets.set(root, list);
  }

  const previousByTitle = new Map<string, Game>();
  for (const game of previous?.games ?? []) {
    for (const title of game.titles) previousByTitle.set(title.id, game);
  }

  const games: Game[] = [];
  let changes = 0;
  const today = generatedAt.slice(0, 10);

  for (const bucket of buckets.values()) {
    const titleIds = [...new Set(bucket.map((report) => report.titleId))];
    const previousHits = new Map<string, Game>();
    for (const id of titleIds) {
      const hit = previousByTitle.get(id);
      if (hit) previousHits.set(hit.slug, hit);
    }
    const previousGames = [...previousHits.values()];
    const anchor = previousGames.sort((a, b) => b.titles.length - a.titles.length)[0];
    const name = chooseName(bucket, titles, anchor?.name);
    const slug = anchor?.slug || slugifyName(name);

    const priorTitles = new Map<string, TitleRef>();
    for (const game of previousGames) {
      for (const title of game.titles) priorTitles.set(title.id, title);
    }

    const titleRefs: TitleRef[] = titleIds.sort().map((id) => {
      const named = bucket.find((report) => report.titleId === id && report.name);
      const info = titles.get(id);
      const platform = bucket.find((report) => report.titleId === id)?.platform ?? "ps3";
      const region = info?.region || priorTitles.get(id)?.region;
      return {
        id,
        platform,
        name: cleanDisplayName(named?.name || info?.name || ""),
        ...(region ? { region } : {}),
      };
    });

    const previousHistory = previousGames.flatMap((game) => game.history);
    const previousReports = new Map<string, Game["reports"][number]>();
    for (const game of previousGames) {
      for (const report of game.reports) previousReports.set(`${report.emulator}:${report.titleId}`, report);
    }

    const history: HistoryEvent[] = [];
    const seenHistory = new Set<string>();
    for (const event of previousHistory) {
      const key = `${event.emulator}:${event.titleId}:${event.at}:${event.status}:${event.initial}:${event.from ?? ""}`;
      if (seenHistory.has(key)) continue;
      seenHistory.add(key);
      history.push(event);
    }

    for (const report of bucket) {
      const key = `${report.emulator}:${report.titleId}`;
      const prior = previousReports.get(key);
      if (!prior) {
        history.push({
          emulator: report.emulator,
          titleId: report.titleId,
          status: report.status,
          at: report.updatedAt,
          initial: true,
        });
        continue;
      }
      if (prior.status !== report.status) {
        history.push({
          emulator: report.emulator,
          titleId: report.titleId,
          status: report.status,
          from: prior.status,
          at: today,
          initial: false,
        });
        changes += 1;
      }
    }

    history.sort((a, b) => a.at.localeCompare(b.at) || a.emulator.localeCompare(b.emulator));
    const trimmed = history.slice(-HISTORY_CAP);

    const storedReports = bucket
      .map((report) => toStoredReport(report))
      .sort((a, b) => a.emulator.localeCompare(b.emulator) || a.titleId.localeCompare(b.titleId));

    const inherited = [
      ...new Set(previousGames.flatMap((game) => [game.slug, ...(game.aliases ?? [])])),
    ];
    games.push({
      slug,
      ...(inherited.length ? { aliases: inherited } : {}),
      name,
      titles: titleRefs,
      reports: storedReports,
      history: trimmed,
    });
  }

  const catalog = withCanonicalSlugs({ generatedAt, games });
  catalog.games.sort((a, b) => a.name.localeCompare(b.name) || a.slug.localeCompare(b.slug));
  return { catalog, changes };
}

function chooseName(bucket: RawReport[], titles: Map<string, TitleInfo>, previousName?: string): string {
  if (bucket.some((report) => report.titleId === "PPSA02929" && report.emulator === "anyps5" && report.status === "playable")) {
    const onlyThat = bucket.every((report) => report.titleId === "PPSA02929");
    if (onlyThat) return "Dreaming Sarah";
  }
  const candidates: { name: string; rank: number }[] = [];
  for (const report of bucket) {
    const info = titles.get(report.titleId);
    if (info && isUsefulTitle(info.name)) {
      candidates.push({ name: cleanDisplayName(info.name), rank: info.regionRank });
    }
    if (report.name && isUsefulTitle(report.name)) {
      candidates.push({ name: cleanDisplayName(report.name), rank: info ? info.regionRank + 1 : 5 });
    }
  }
  if (previousName && isUsefulTitle(previousName)) {
    candidates.push({ name: cleanDisplayName(previousName), rank: 4 });
  }
  candidates.sort((a, b) => a.rank - b.rank || a.name.length - b.name.length);
  return candidates[0]?.name || bucket[0]?.titleId || "Unknown title";
}

function toStoredReport(report: RawReport): Report {
  return {
    emulator: report.emulator,
    titleId: report.titleId,
    status: report.status,
    updatedAt: report.updatedAt,
    sourceUrl: report.sourceUrl,
    ...(report.os ? { os: report.os } : {}),
    ...(report.note ? { note: report.note } : {}),
    ...(report.bringUp ? { bringUp: report.bringUp } : {}),
  };
}

export function toSearchIndex(catalog: Catalog): SearchEntry[] {
  return catalog.games.map((game) => {
    const statuses = game.reports.map((report) => report.status);
    const updatedAt = game.reports.reduce(
      (latest, report) => (report.updatedAt > latest ? report.updatedAt : latest),
      "1970-01-01",
    );
    const platforms = [...new Set(game.titles.map((title) => title.platform))].sort();
    return {
      slug: game.slug,
      name: game.name,
      ids: game.titles.map((title) => title.id),
      platforms,
      best: bestStatus(statuses) ?? "nothing",
      updatedAt,
      reports: game.reports.map((report) => ({ emulator: report.emulator, status: report.status })),
    };
  });
}

export function carryForward(previous: Catalog | null, failed: EmulatorId[], reports: RawReport[]): RawReport[] {
  if (!previous || failed.length === 0) return reports;
  const failedSet = new Set(failed);
  const carried: RawReport[] = [];
  for (const game of previous.games) {
    for (const report of game.reports) {
      if (!failedSet.has(report.emulator)) continue;
      const title = game.titles.find((item) => item.id === report.titleId);
      carried.push({
        ...report,
        name: title?.name || game.name,
        platform: title?.platform ?? "ps3",
      });
    }
  }
  return [...reports, ...carried];
}
