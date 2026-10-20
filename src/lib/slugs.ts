import { normalizeName, slugifyName } from "@/lib/identity";
import type { Catalog, Game } from "@/lib/types";

export type SlugSeed = {
  name: string;
  titleIds: string[];
  storedSlug?: string;
  storedAliases?: string[];
};

export type SlugAssignment = {
  slug: string;
  aliases: string[];
};

function titleKey(titleIds: string[]): string {
  const sorted = titleIds.map((id) => id.toLowerCase()).filter(Boolean).sort();
  return sorted[0] ?? "untitled";
}

/** Slug the previous normalizer produced, before diacritics and apostrophes were folded. */
export function legacySlugifyName(name: string): string {
  const slug = normalizeName(name).replace(/\s+/g, "-").replace(/^-+|-+$/g, "");
  return slug || "untitled";
}

function isLegacySlug(stored: string, legacy: string): boolean {
  if (stored === legacy) return true;
  const prefix = `${legacy}-`;
  if (!stored.startsWith(prefix)) return false;
  return /^[a-z0-9]{4}\d{5}(-\d+)?$/.test(stored.slice(prefix.length));
}

/**
 * One canonical slug per name. A game that already owns that slug keeps it.
 * Later collisions get the first title ID. Previous slugs stay as aliases.
 */
export function assignSlugs(items: SlugSeed[]): SlugAssignment[] {
  const desired = items.map((item) => slugifyName(item.name));
  const keys = items.map((item) => titleKey(item.titleIds));
  const order = items
    .map((_, index) => index)
    .sort((a, b) => items[a].name.localeCompare(items[b].name) || keys[a].localeCompare(keys[b]) || a - b);

  const taken = new Set<string>();
  const assigned = new Array<string>(items.length);
  const retarget = items.map((item, index) => {
    const stored = item.storedSlug;
    if (!stored) return true;
    const legacy = legacySlugifyName(item.name);
    return legacy !== desired[index] && isLegacySlug(stored, legacy);
  });

  for (const index of order) {
    const slug = items[index].storedSlug;
    if (!slug || retarget[index] || taken.has(slug)) continue;
    assigned[index] = slug;
    taken.add(slug);
  }

  for (const index of order) {
    if (assigned[index]) continue;
    const base = desired[index] || "untitled";
    let slug = taken.has(base) ? `${base}-${keys[index]}` : base;
    let extra = 2;
    while (taken.has(slug)) {
      slug = `${base}-${keys[index]}-${extra}`;
      extra += 1;
    }
    assigned[index] = slug;
    taken.add(slug);
  }

  const canonical = new Set(assigned);
  return items.map((item, index) => {
    const slug = assigned[index] ?? "untitled";
    const aliases = new Set<string>();
    const remember = (value: string | undefined) => {
      if (!value || value === slug || canonical.has(value)) return;
      aliases.add(value);
    };
    remember(item.storedSlug);
    for (const alias of item.storedAliases ?? []) remember(alias);
    return { slug, aliases: [...aliases].sort() };
  });
}

export function withCanonicalSlugs(catalog: Catalog): Catalog {
  const assignments = assignSlugs(
    catalog.games.map((game) => ({
      name: game.name,
      titleIds: game.titles.map((title) => title.id),
      storedSlug: game.slug,
      storedAliases: game.aliases,
    })),
  );
  let changed = false;
  const games = catalog.games.map((game, index) => {
    const next = assignments[index];
    if (!next) return game;
    const aliases = next.aliases.length ? next.aliases : undefined;
    const sameAliases = [...(game.aliases ?? [])].sort().join("\0") === (aliases ?? []).join("\0");
    if (game.slug === next.slug && sameAliases) return game;
    changed = true;
    const copy: Game = { ...game, slug: next.slug };
    if (aliases) copy.aliases = aliases;
    else delete copy.aliases;
    return copy;
  });
  return changed ? { ...catalog, games } : catalog;
}

export function findGameBySlug(games: Game[], slug: string): Game | null {
  return games.find((game) => game.slug === slug) ?? games.find((game) => game.aliases?.includes(slug)) ?? null;
}
