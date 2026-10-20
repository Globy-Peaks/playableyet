import { emulatorPlatform } from "@/lib/emulators";
import { PLATFORMS, type Platform, type SearchEntry } from "@/lib/types";

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
 * Search key: accents, apostrophes, and other punctuation do not separate words.
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

function searchTextMatches(query: string, fields: string[]): boolean {
  const needle = normalizeSearchText(query);
  if (!needle) return true;
  const compactNeedle = needle.replaceAll(" ", "");
  return fields.some((field) => {
    const haystack = normalizeSearchText(field);
    if (haystack.includes(needle)) return true;
    return compactNeedle.length > 0 && haystack.replaceAll(" ", "").includes(compactNeedle);
  });
}

export function matchesSearchFilters(entry: SearchEntry, filters: SearchFilters): boolean {
  const query = filters.query?.trim() ?? "";
  if (query && !searchTextMatches(query, [entry.name, ...entry.ids])) return false;

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
