import { groupKey, normalizeName, slugifyName } from "@/lib/identity";
import { TITLE_GROUP_ALIASES, type TitleGroupAlias } from "@/lib/title-group-aliases";
import { withCanonicalSlugs } from "@/lib/slugs";
import type { Catalog, Game, HistoryEvent, Report, TitleRef } from "@/lib/types";

const HISTORY_CAP = 40;
const PUNCTUATION = /['’‘ʼ`´:]/g;

/**
 * Series labels inserted in one region's title.
 * "Ratchet & Clank Future: Tools of Destruction" and
 * "Ratchet & Clank: Tools of Destruction" share a key once "future" is gone.
 */
const SERIES_SUBTITLES = new Set(["future"]);

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

/** Grouping key with a regional series subtitle removed. The sync log uses this. */
export function regionalVariantKey(name: string): string {
  return groupKey(name)
    .split(" ")
    .filter((word) => word && !SERIES_SUBTITLES.has(word))
    .join(" ");
}

/**
 * Separate pages whose titles match once a series subtitle such as "Future" is removed.
 * Curated groups are merged first, so this list is what still needs a look.
 */
export function regionalVariantCollisions(games: Game[]): TitleCollision[] {
  const byKey = new Map<string, Game[]>();
  for (const game of games) {
    const key = regionalVariantKey(game.name);
    if (key.length < 4) continue;
    const list = byKey.get(key) ?? [];
    list.push(game);
    byKey.set(key, list);
  }
  const collisions: TitleCollision[] = [];
  for (const [key, group] of byKey) {
    if (group.length < 2) continue;
    const keys = new Set(group.map((game) => groupKey(game.name)));
    if (keys.size < 2) continue;
    collisions.push({ key, slugs: group.map((game) => game.slug).sort() });
  }
  collisions.sort((a, b) => a.key.localeCompare(b.key) || a.slugs[0].localeCompare(b.slugs[0]));
  return collisions;
}

export function logRegionalVariantCollisions(games: Game[]): void {
  for (const collision of regionalVariantCollisions(games)) {
    console.log(`regional variant collision "${collision.key}": ${collision.slugs.join(", ")}`);
  }
}

/** Punctuation folding, then the curated regional titles, then one slug per page. */
export function publishCatalog(catalog: Catalog): Catalog {
  return withCanonicalSlugs(mergeRegionalVariants(mergePunctuationVariants(catalog)));
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

type RegionalGroup = {
  indexes: number[];
  name: string;
};

/**
 * Fold curated regional titles onto one page. Demos stay in their own groups.
 * Anything not on the list stays split and can show up in the sync log.
 */
export function mergeRegionalVariants(catalog: Catalog): Catalog {
  const groups = regionalGroups(catalog.games);
  if (groups.length === 0) return catalog;
  const published = withCanonicalSlugs(catalog);
  const skip = new Set<number>();
  const replacements = new Map<number, Game>();
  for (const group of groups) {
    const games = group.indexes.map((index) => published.games[index]).filter((game): game is Game => Boolean(game));
    if (games.length < 2) continue;
    replacements.set(group.indexes[0], mergeGameGroup(games, group.name));
    for (const index of group.indexes.slice(1)) skip.add(index);
  }
  const games: Game[] = [];
  catalog.games.forEach((game, index) => {
    if (skip.has(index)) return;
    games.push(replacements.get(index) ?? game);
  });
  return { ...catalog, games };
}

function regionalGroups(games: Game[]): RegionalGroup[] {
  const keyToAlias = new Map<string, TitleGroupAlias>();
  for (const alias of TITLE_GROUP_ALIASES) {
    for (const spelling of [alias.name, ...alias.variants]) {
      keyToAlias.set(groupKey(spelling), alias);
    }
  }
  const buckets = new Map<TitleGroupAlias, number[]>();
  games.forEach((game, index) => {
    const alias = keyToAlias.get(groupKey(game.name));
    if (!alias) return;
    const list = buckets.get(alias) ?? [];
    list.push(index);
    buckets.set(alias, list);
  });
  const groups: RegionalGroup[] = [];
  for (const [alias, indexes] of buckets) {
    if (indexes.length < 2) continue;
    groups.push({ indexes, name: alias.name });
  }
  return groups;
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

function mergeGameGroup(games: Game[], preferredName?: string): Game {
  const preferred = preferPunctuatedName(preferredName || games[0]?.name || "", games.map((game) => game.name));
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
