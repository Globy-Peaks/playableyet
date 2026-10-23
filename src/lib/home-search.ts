import { matchesSearchFilters } from "@/lib/search-filters";
import type { SearchEntry } from "@/lib/types";

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
  return entries.filter((entry) =>
    matchesSearchFilters(entry, {
      query: search.q,
      platform: search.platform,
      emulator: search.emulator,
      status: search.status,
    }),
  );
}

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

function clean(value: string): string {
  return value.replace(/\s+/g, " ").trim().slice(0, QUERY_LIMIT);
}
