import { EMULATORS } from "@/lib/emulators";
import { STATUS_LABEL, bestStatus } from "@/lib/status";
import { EMULATOR_IDS, type Game } from "@/lib/types";

export type OgStatusLine = { project: string; label: string };

/** One raw status label per project that has a report. Missing projects are omitted. */
export function ogStatusLines(game: Game): OgStatusLine[] {
  return EMULATOR_IDS.flatMap((id) => {
    const status = bestStatus(game.reports.filter((report) => report.emulator === id).map((report) => report.status));
    if (!status) return [];
    return [{ project: EMULATORS[id].name, label: STATUS_LABEL[status] }];
  });
}
