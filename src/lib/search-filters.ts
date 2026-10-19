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
/** Case- and accent-insensitive match text. "yotei" matches "Yōtei". */
export function foldSearchText(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function matchesSearchFilters(entry: SearchEntry, filters: SearchFilters): boolean {
  const needle = foldSearchText(filters.query?.trim() ?? "");
  if (needle) {
    const name = foldSearchText(entry.name).includes(needle);
    const id = entry.ids.some((value) => foldSearchText(value).includes(needle));
    if (!name && !id) return false;
  }

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
