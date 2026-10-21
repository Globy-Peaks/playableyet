import type { EmulatorId, HistoryEvent } from "@/lib/types";

/** A later snapshot recorded a different status. The first observation is not a change. */
export function isRecordedStatusChange(event: HistoryEvent): boolean {
  return !event.initial && !!event.from && event.from !== event.status;
}

/** Day a sync recorded a new status for this title ID, or null when it has only been seen once. */
export function latestStatusChangeAt(history: HistoryEvent[], emulator: EmulatorId, titleId: string): string | null {
  let latest = "";
  for (const event of history) {
    if (event.emulator !== emulator || event.titleId !== titleId) continue;
    if (!isRecordedStatusChange(event)) continue;
    if (event.at > latest) latest = event.at;
  }
  return latest || null;
}
