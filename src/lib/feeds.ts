import { EMULATORS } from "@/lib/emulators";
import { daysBetween } from "@/lib/status";
import type { Catalog, EmulatorId, Status } from "@/lib/types";

export type FeedItem = {
  slug: string;
  name: string;
  emulator: EmulatorId;
  titleId: string;
  at: string;
  status: Status;
  from?: Status;
};

export type EmulatorStat = {
  emulator: EmulatorId;
  reports: number;
  playable: number;
};

export function summarize(catalog: Catalog) {
  const stats = new Map<EmulatorId, EmulatorStat>();
  for (const id of Object.keys(EMULATORS) as EmulatorId[]) {
    stats.set(id, { emulator: id, reports: 0, playable: 0 });
  }
  for (const game of catalog.games) {
    for (const report of game.reports) {
      const stat = stats.get(report.emulator);
      if (!stat) continue;
      stat.reports += 1;
      if (report.status === "playable") stat.playable += 1;
    }
  }
  return {
    games: catalog.games.length,
    generatedAt: catalog.generatedAt,
    emulators: [...stats.values()],
  };
}

export function newlyPlayable(catalog: Catalog): FeedItem[] {
  const items: FeedItem[] = [];
  const seen = new Set<string>();
  for (const game of catalog.games) {
    for (const report of game.reports) {
      if (report.status !== "playable") continue;
      const age = daysBetween(catalog.generatedAt, report.updatedAt);
      if (age === null || age < 0 || age > 7) continue;
      const key = `${game.slug}:${report.emulator}`;
      if (seen.has(key)) continue;
      seen.add(key);
      items.push({
        slug: game.slug,
        name: game.name,
        emulator: report.emulator,
        titleId: report.titleId,
        at: report.updatedAt,
        status: report.status,
      });
    }
  }
  items.sort((a, b) => b.at.localeCompare(a.at) || a.name.localeCompare(b.name));
  return items;
}

export function statusChanges(catalog: Catalog): FeedItem[] {
  const items: FeedItem[] = [];
  for (const game of catalog.games) {
    for (const event of game.history) {
      if (event.initial || !event.from || event.from === event.status) continue;
      items.push({
        slug: game.slug,
        name: game.name,
        emulator: event.emulator,
        titleId: event.titleId,
        at: event.at,
        status: event.status,
        from: event.from,
      });
    }
  }
  items.sort((a, b) => b.at.localeCompare(a.at) || a.name.localeCompare(b.name));
  return items;
}
