import { EMULATORS, PLATFORM_LABEL } from "@/lib/emulators";
import { STATUS_LABEL, STATUS_RANK } from "@/lib/status";
import { EMULATOR_IDS, PLATFORMS, type Game, type Status } from "@/lib/types";

export function gameSeoTitle(name: string): string {
  return `Is ${name} playable yet?`;
}

/**
 * Summarizes statuses that are actually on the game's reports.
 * A project with several regional reports lists each distinct status.
 * Projects with no report are omitted.
 */
export function gameSeoDescription(game: Game): string {
  const title = gameSeoTitle(game.name);
  const groups = PLATFORMS.flatMap((platform) => {
    const bits = EMULATOR_IDS.filter((id) => EMULATORS[id].platform === platform).flatMap((id) => {
      const statuses = uniqueStatuses(game.reports.filter((report) => report.emulator === id).map((report) => report.status));
      if (statuses.length === 0) return [];
      return [`${EMULATORS[id].name} ${statuses.map((status) => STATUS_LABEL[status]).join(" and ")}`];
    });
    if (bits.length === 0) return [];
    return [`${PLATFORM_LABEL[platform]}: ${bits.join(", ")}`];
  });
  if (groups.length === 0) return `${title} No public compatibility report in this snapshot.`;
  return `${title} ${groups.join(". ")}.`;
}

function uniqueStatuses(statuses: Status[]): Status[] {
  return [...new Set(statuses)].sort((left, right) => STATUS_RANK[right] - STATUS_RANK[left]);
}
