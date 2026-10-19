import type { HistoryEvent } from "@/lib/types";

/** Game URLs use the latest real status change. Everything else uses the snapshot time. */
export function gameLastModified(history: HistoryEvent[], snapshotGeneratedAt: string): string {
  let latest = "";
  for (const event of history) {
    if (event.initial || !event.from || event.from === event.status) continue;
    if (event.at > latest) latest = event.at;
  }
  return latest || snapshotGeneratedAt;
}
