import { matchesSearchFilters, partialSearchScore, searchMatchRank } from "@/lib/search-filters";
import type { SearchEntry } from "@/lib/types";

const CLOSEST_LIMIT = 5;
const CLOSEST_MIN_WORDS = 2;

export type HomeSearch = {
  q: string;
  platform: string;
  emulator: string;
  status: string;
  page: number;
};

const QUERY_LIMIT = 120;
export const SEARCH_PAGE_SIZE = 40;

export function searchCountLabel(shown: number, total: number): string {
  const games = shown === 1 ? "game" : "games";
  const text = `${shown.toLocaleString()} ${games}`;
  return shown === total ? text : `${text} of ${total.toLocaleString()}`;
}

export function readHomeSearch(input: {
  q?: string | string[];
  platform?: string | string[];
  emulator?: string | string[];
  status?: string | string[];
  page?: string | string[];
}): HomeSearch {
  return {
    q: clean(first(input.q)),
    platform: clean(first(input.platform)),
    emulator: clean(first(input.emulator)),
    status: clean(first(input.status)),
    page: Math.max(1, Number(first(input.page) || "1") || 1),
  };
}

export function isFilteredSearch(search: HomeSearch): boolean {
  return Boolean(search.q || search.platform || search.emulator || search.status || search.page > 1);
}

export function searchResultTitle(search: HomeSearch): string | null {
  if (!isFilteredSearch(search)) return null;
  if (search.q) return `Search results for ${search.q}`;
  return "Search results";
}

export function homeSearchHref(search: HomeSearch, page = search.page): string {
  const params = new URLSearchParams();
  if (search.q) params.set("q", search.q);
  if (search.platform) params.set("platform", search.platform);
  if (search.emulator) params.set("emulator", search.emulator);
  if (search.status) params.set("status", search.status);
  if (page > 1) params.set("page", String(page));
  const text = params.toString();
  return text ? `/?${text}` : "/";
}

export function filterSearchEntries(entries: SearchEntry[], search: HomeSearch): SearchEntry[] {
  const matched = entries.filter((entry) =>
    matchesSearchFilters(entry, {
      query: search.q,
      platform: search.platform,
      emulator: search.emulator,
      status: search.status,
    }),
  );
  if (!search.q) return matched;
  return matched
    .map((entry, index) => ({ entry, index, rank: searchMatchRank(entry, search.q) }))
    .sort((a, b) => b.rank - a.rank || a.index - b.index)
    .map((item) => item.entry);
}

/**
 * Titles that contain the most query words when nothing contains all of them.
 * Full matches are omitted. Fewer than two shared words is not a suggestion.
 */
export function closestSearchEntries(entries: SearchEntry[], search: HomeSearch, limit = CLOSEST_LIMIT): SearchEntry[] {
  const query = search.q.trim();
  if (!query) return [];
  const ranked: { entry: SearchEntry; score: number; index: number }[] = [];
  entries.forEach((entry, index) => {
    if (
      !matchesSearchFilters(entry, {
        platform: search.platform,
        emulator: search.emulator,
        status: search.status,
      })
    ) {
      return;
    }
    if (searchMatchRank(entry, query) > 0) return;
    const score = partialSearchScore(query, entry.name);
    if (score < CLOSEST_MIN_WORDS) return;
    ranked.push({ entry, score, index });
  });
  if (ranked.length === 0) return [];
  const best = Math.max(...ranked.map((item) => item.score));
  return ranked
    .filter((item) => item.score === best)
    .sort((a, b) => a.index - b.index)
    .slice(0, limit)
    .map((item) => item.entry);
}

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

function clean(value: string): string {
  return value.replace(/\s+/g, " ").trim().slice(0, QUERY_LIMIT);
}
