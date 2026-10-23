import { groupKey, normalizeName, slugifyName } from "@/lib/identity";
import { withCanonicalSlugs } from "@/lib/slugs";
import type { Catalog, Game, HistoryEvent, Report, TitleRef } from "@/lib/types";

const HISTORY_CAP = 40;
const PUNCTUATION = /['’‘ʼ`´:]/g;

export type TitleCollision = {
  key: string;
  slugs: string[];
};

/** Games that still share a grouping key after apostrophes are folded. Sync logs these. */
export function normalizedTitleCollisions(games: Game[]): TitleCollision[] {
  const byKey = new Map<string, string[]>();
  for (const game of games) {
    const key = groupKey(game.name);
    if (key.length < 4) continue;
    const list = byKey.get(key) ?? [];
    list.push(game.slug);
    byKey.set(key, list);
  }
  const collisions: TitleCollision[] = [];
  for (const [key, slugs] of byKey) {
    if (slugs.length < 2) continue;
    collisions.push({ key, slugs: [...slugs].sort() });
  }
  collisions.sort((a, b) => a.key.localeCompare(b.key) || a.slugs[0].localeCompare(b.slugs[0]));
  return collisions;
}

export function logNormalizedTitleCollisions(games: Game[]): void {
  for (const collision of normalizedTitleCollisions(games)) {
    console.log(`normalized title collision "${collision.key}": ${collision.slugs.join(", ")}`);
  }
}

/**
 * Fold games whose titles differ only by apostrophes or punctuation into one page.
 * Identical normalized names stay separate and are left for the sync log.
 */
export function mergePunctuationVariants(catalog: Catalog): Catalog {
  const groups = punctuationGroups(catalog.games);
  if (groups.length === 0) return catalog;
  const published = withCanonicalSlugs(catalog);
  const skip = new Set<number>();
  const replacements = new Map<number, Game>();
  for (const indexes of groups) {
    const games = indexes.map((index) => published.games[index]).filter((game): game is Game => Boolean(game));
    if (games.length < 2) continue;
    replacements.set(indexes[0], mergeGameGroup(games));
    for (const index of indexes.slice(1)) skip.add(index);
  }
  const games: Game[] = [];
  catalog.games.forEach((game, index) => {
    if (skip.has(index)) return;
    games.push(replacements.get(index) ?? game);
  });
  return { ...catalog, games };
}

/** Prefer the official apostrophe or colon when both spellings are the same title. */
export function preferPunctuatedName(chosen: string, candidates: string[]): string {
  const key = groupKey(chosen);
  if (key.length < 4) return chosen;
  let best = chosen;
  let bestScore = punctuationWeight(chosen);
  for (const candidate of candidates) {
    const text = candidate.trim();
    if (!text || groupKey(text) !== key) continue;
    const score = punctuationWeight(text);
    if (score > bestScore || (score === bestScore && text.length > best.length)) {
      best = text;
      bestScore = score;
    }
  }
  return best;
}

function punctuationGroups(games: Game[]): number[][] {
  const byKey = new Map<string, number[]>();
  games.forEach((game, index) => {
    const key = groupKey(game.name);
    if (key.length < 4) return;
    const list = byKey.get(key) ?? [];
    list.push(index);
    byKey.set(key, list);
  });
  const groups: number[][] = [];
  for (const indexes of byKey.values()) {
    if (indexes.length < 2) continue;
    const names = new Set(indexes.map((index) => normalizeName(games[index]?.name ?? "")));
    if (names.size < 2) continue;
    groups.push(indexes);
  }
  return groups;
}

function mergeGameGroup(games: Game[]): Game {
  const preferred = preferPunctuatedName(games[0]?.name ?? "", games.map((game) => game.name));
  const slug = slugifyName(preferred);
  const aliases = [
    ...new Set(games.flatMap((game) => [game.slug, ...(game.aliases ?? [])])),
  ]
    .filter((alias) => alias && alias !== slug)
    .sort();
  const titles = new Map<string, TitleRef>();
  for (const game of games) {
    for (const title of game.titles) {
      const existing = titles.get(title.id);
      titles.set(title.id, existing ? { ...existing, ...presentTitleFields(title) } : title);
    }
  }
  const reports = new Map<string, Report>();
  for (const game of games) {
    for (const report of game.reports) {
      const key = `${report.emulator}:${report.titleId}`;
      const existing = reports.get(key);
      if (!existing || report.updatedAt > existing.updatedAt) reports.set(key, report);
    }
  }
  const history: HistoryEvent[] = [];
  const seenHistory = new Set<string>();
  for (const game of games) {
    for (const event of game.history) {
      const key = `${event.emulator}:${event.titleId}:${event.at}:${event.status}:${event.initial}:${event.from ?? ""}`;
      if (seenHistory.has(key)) continue;
      seenHistory.add(key);
      history.push(event);
    }
  }
  history.sort((a, b) => a.at.localeCompare(b.at) || a.emulator.localeCompare(b.emulator));
  return {
    slug,
    ...(aliases.length ? { aliases } : {}),
    name: preferred,
    titles: [...titles.values()].sort((a, b) => a.id.localeCompare(b.id)),
    reports: [...reports.values()].sort((a, b) => a.emulator.localeCompare(b.emulator) || a.titleId.localeCompare(b.titleId)),
    history: history.slice(-HISTORY_CAP),
  };
}

function punctuationWeight(name: string): number {
  return name.match(PUNCTUATION)?.length ?? 0;
}

function presentTitleFields(title: TitleRef): Partial<TitleRef> {
  return {
    ...(title.name ? { name: title.name } : {}),
    ...(title.region ? { region: title.region } : {}),
  };
}
