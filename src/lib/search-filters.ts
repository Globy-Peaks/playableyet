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
export function matchesSearchFilters(entry: SearchEntry, filters: SearchFilters): boolean {
  const needle = filters.query?.trim().toLowerCase() ?? "";
  if (needle) {
    const name = entry.name.toLowerCase().includes(needle);
    const id = entry.ids.some((value) => value.toLowerCase().includes(needle));
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
