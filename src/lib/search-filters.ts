import { emulatorPlatform } from "@/lib/emulators";
import { SEARCH_ALIASES, expandAliasWords } from "@/lib/search-aliases";
import { PLATFORMS, type Platform, type SearchEntry } from "@/lib/types";

const ALIAS_TOKENS = new Set(SEARCH_ALIASES.map((alias) => alias.token));
const MIN_PREFIX = 3;

export type SearchFilters = {
  query?: string;
  platform?: string;
  emulator?: string;
  status?: string;
};

/**
 * Platform, project, and status have to match one report.
 * A playable RPCS3 report does not satisfy AnyPS5 + Playable, and it does not
 * satisfy PS5 + Playable when the PS5 projects are still behind.
 */

const ROMAN_TABLE: [number, string][] = [
  [10, "x"],
  [9, "ix"],
  [5, "v"],
  [4, "iv"],
  [1, "i"],
];

function canonicalRoman(value: number): string {
  let rest = value;
  let out = "";
  while (rest >= 10) {
    out += "x";
    rest -= 10;
  }
  for (const [amount, glyph] of ROMAN_TABLE) {
    while (rest >= amount) {
      out += glyph;
      rest -= amount;
    }
  }
  return out;
}

/** Standalone sequel numerals such as ii, iv, and xii. Single letters stay words. */
function romanToken(token: string): string | null {
  if (!/^[ivx]{2,4}$/.test(token)) return null;
  let total = 0;
  let previous = 0;
  for (let index = token.length - 1; index >= 0; index -= 1) {
    const value = token[index] === "x" ? 10 : token[index] === "v" ? 5 : 1;
    if (value < previous) total -= value;
    else {
      total += value;
      previous = value;
    }
  }
  if (total < 2 || total > 39 || canonicalRoman(total) !== token) return null;
  return String(total);
}

/**
 * Search key: accents, apostrophes, and other punctuation do not change the words.
 * "Yakuza: Dead Souls" and "yakuza dead souls" share a key. "II" and "2" do too.
 */
export function normalizeSearchText(value: string): string {
  const folded = value
    .replace(/[\u2122\u00AE\u00A9]/g, "")
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/['’‘ʼ`´]/g, "")
    .toLowerCase();
  const spaced = folded.replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
  if (!spaced) return "";
  return spaced
    .split(" ")
    .map((token) => romanToken(token) ?? token)
    .join(" ");
}

function wordMatches(titleWord: string, queryWord: string): boolean {
  if (titleWord === queryWord) return true;
  // Abbreviations are exact tokens. "des" must not also prefix "destiny".
  if (ALIAS_TOKENS.has(queryWord) || queryWord.length < MIN_PREFIX) return false;
  return titleWord.startsWith(queryWord);
}

/** Contiguous whole words, or a prefix of each word. Letters do not cross a word boundary. */
function wordsMatch(queryWords: string[], titleWords: string[]): boolean {
  if (queryWords.length === 0 || queryWords.length > titleWords.length) return false;
  for (let start = 0; start <= titleWords.length - queryWords.length; start += 1) {
    let matched = true;
    for (let index = 0; index < queryWords.length; index += 1) {
      if (!wordMatches(titleWords[start + index] ?? "", queryWords[index] ?? "")) {
        matched = false;
        break;
      }
    }
    if (matched) return true;
  }
  return false;
}

function matchesName(query: string, name: string): boolean {
  const needle = normalizeSearchText(query);
  if (!needle) return true;
  const raw = needle.split(" ");
  const expanded = expandAliasWords(raw);
  const words = normalizeSearchText(name).split(" ").filter(Boolean);
  if (wordsMatch(raw, words)) return true;
  return expanded.join(" ") !== raw.join(" ") && wordsMatch(expanded, words);
}

function matchesTitleId(query: string, ids: string[]): boolean {
  const needle = normalizeSearchText(query).replaceAll(" ", "");
  if (needle.length < 4) return false;
  return ids.some((id) => normalizeSearchText(id).replaceAll(" ", "").includes(needle));
}

const ORIGINAL_TOKEN = /[^\p{L}\p{N}]+/u;

/** Schema.org alternateName values, such as "GTA V" for Grand Theft Auto V. */
export function alternateNamesForTitle(name: string): string[] {
  const normalized = normalizeSearchText(name).split(" ").filter(Boolean);
  const original = name
    .replace(/[\u2122\u00AE\u00A9]/g, "")
    .replace(/['’‘ʼ`´]/g, "")
    .split(ORIGINAL_TOKEN)
    .filter(Boolean);
  if (normalized.length === 0 || normalized.length !== original.length) return [];
  const names: string[] = [];
  for (const alias of SEARCH_ALIASES) {
    const expansion = alias.expansion.split(" ");
    if (expansion.length > normalized.length) continue;
    const matched = expansion.every((word, index) => normalized[index] === word);
    if (!matched) continue;
    const rest = original.slice(expansion.length);
    names.push([alias.label, ...rest].join(" "));
  }
  return names;
}

export function matchesSearchFilters(entry: SearchEntry, filters: SearchFilters): boolean {
  const query = filters.query?.trim() ?? "";
  if (query && !matchesName(query, entry.name) && !matchesTitleId(query, entry.ids)) return false;

  const platform = filters.platform?.trim() ?? "";
  const emulator = filters.emulator?.trim() ?? "";
  const status = filters.status?.trim() ?? "";
  if (platform) {
    if (!isPlatform(platform) || !entry.platforms.includes(platform)) return false;
  }
  if (!emulator && !status) return true;

  return entry.reports.some((report) => {
    if (emulator && report.emulator !== emulator) return false;
    if (status && report.status !== status) return false;
    if (platform && emulatorPlatform(report.emulator) !== platform) return false;
    return true;
  });
}

function isPlatform(value: string): value is Platform {
  return (PLATFORMS as readonly string[]).includes(value);
}
