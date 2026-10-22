import { emulatorCoverage } from "@/lib/hubs";
import { isRecordedStatusChange } from "@/lib/report-dates";
import { daysBetween } from "@/lib/status";
import type { TitleEdition } from "@/lib/title-edition";
import type { Catalog, EmulatorId, Status } from "@/lib/types";

export type FeedItem = {
  slug: string;
  name: string;
  emulator: EmulatorId;
  editions: TitleEdition[];
  at: string;
  status: Status;
  from?: Status;
};

export function summarize(catalog: Catalog) {
  return {
    games: catalog.games.length,
    generatedAt: catalog.generatedAt,
    emulators: emulatorCoverage(catalog),
  };
}

/** Moves to Playable recorded in history, newest first. A first sighting is not a move. */
export function recentlyPlayable(catalog: Catalog, emulator: EmulatorId): FeedItem[] {
  return statusChanges(catalog).filter((item) => item.emulator === emulator && item.status === "playable");
}

function editionFor(regions: Map<string, string | undefined>, titleId: string): TitleEdition {
  const region = regions.get(titleId);
  return region ? { id: titleId, region } : { id: titleId };
}

function withinWeek(generatedAt: string, day: string): boolean {
  const age = daysBetween(generatedAt, day);
  return age !== null && age >= 0 && age <= 7;
}

/** Games whose status changed to Playable in the last 7 days, newest change first. */
export function newlyPlayable(catalog: Catalog): FeedItem[] {
  const items: FeedItem[] = [];
  for (const game of catalog.games) {
    const regions = new Map(game.titles.map((title) => [title.id, title.region]));
    const latest = new Map<EmulatorId, { at: string; ids: Set<string> }>();
    for (const event of game.history) {
      if (event.status !== "playable" || !isRecordedStatusChange(event)) continue;
      if (!withinWeek(catalog.generatedAt, event.at)) continue;
      const current = latest.get(event.emulator);
      if (!current || event.at > current.at) {
        latest.set(event.emulator, { at: event.at, ids: new Set([event.titleId]) });
      } else if (event.at === current.at) {
        current.ids.add(event.titleId);
      }
    }
    for (const [emulator, info] of latest) {
      items.push({
        slug: game.slug,
        name: game.name,
        emulator,
        editions: [...info.ids].sort().map((id) => editionFor(regions, id)),
        at: info.at,
        status: "playable",
      });
    }
  }
  items.sort(compareFeed);
  return items;
}

/**
 * One row per game, project, transition, and day.
 * Editions that made the same change are listed together.
 */
export function statusChanges(catalog: Catalog): FeedItem[] {
  const groups = new Map<string, FeedItem>();
  for (const game of catalog.games) {
    const regions = new Map(game.titles.map((title) => [title.id, title.region]));
    for (const event of game.history) {
      if (!isRecordedStatusChange(event)) continue;
      const key = `${game.slug}\0${event.emulator}\0${event.from}\0${event.status}\0${event.at}`;
      const edition = editionFor(regions, event.titleId);
      const existing = groups.get(key);
      if (existing) {
        if (!existing.editions.some((item) => item.id === edition.id)) existing.editions.push(edition);
        continue;
      }
      groups.set(key, {
        slug: game.slug,
        name: game.name,
        emulator: event.emulator,
        editions: [edition],
        at: event.at,
        status: event.status,
        from: event.from,
      });
    }
  }
  const items = [...groups.values()];
  for (const item of items) item.editions.sort((a, b) => a.id.localeCompare(b.id));
  items.sort(compareFeed);
  return items;
}

function compareFeed(a: FeedItem, b: FeedItem): number {
  return b.at.localeCompare(a.at) || a.name.localeCompare(b.name) || a.emulator.localeCompare(b.emulator);
}
