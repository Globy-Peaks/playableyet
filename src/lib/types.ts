export const PLATFORMS = ["ps3", "ps4", "ps5"] as const;
export type Platform = (typeof PLATFORMS)[number];

export const EMULATOR_IDS = [
  "rpcs3",
  "shadps4",
  "fpps4",
  "sharpemu",
  "kytyps5",
  "anyps5",
] as const;
export type EmulatorId = (typeof EMULATOR_IDS)[number];

export const STATUSES = [
  "playable",
  "ingame",
  "intro",
  "menus",
  "loadable",
  "boots",
  "in-bring-up",
  "nothing",
] as const;
export type Status = (typeof STATUSES)[number];

export type OpenBlocker = {
  id: string;
  title: string;
  url?: string;
};

/** Community roadmap progress. This is not the normalized playable status. */
export type BringUp = {
  /** Stage reached on main, or null when the roadmap has no qualifying stage. */
  stage: string | null;
  detail?: string;
  blockers: OpenBlocker[];
};

export type Report = {
  emulator: EmulatorId;
  titleId: string;
  status: Status;
  /** YYYY-MM-DD from the source, or the sync day when the source has no date. */
  updatedAt: string;
  sourceUrl: string;
  os?: string[];
  note?: string;
  bringUp?: BringUp;
};

export type HistoryEvent = {
  emulator: EmulatorId;
  titleId: string;
  status: Status;
  at: string;
  initial: boolean;
  from?: Status;
};

export type TitleRef = {
  id: string;
  platform: Platform;
  name?: string;
  /** PlayStation-Titles region code, such as UP or EP, when that index had one. */
  region?: string;
};

export type Game = {
  slug: string;
  /** Older slugs that permanently redirect to `slug`. */
  aliases?: string[];
  name: string;
  titles: TitleRef[];
  reports: Report[];
  history: HistoryEvent[];
};

/** Per-source result stored with a snapshot and on /api/status. */
export type SourceFreshness = {
  id: string;
  ok: boolean;
  count: number;
  /** Last successful fetch. Null when that time was not recorded. */
  asOf: string | null;
  /** True when count is reports kept after a failed fetch. */
  carried: boolean;
};

export type Catalog = {
  generatedAt: string;
  games: Game[];
  sources?: SourceFreshness[];
};

export type SourceReport = {
  id: string;
  ok: boolean;
  count: number;
  error?: string;
  note?: string;
};

export type SyncReport = {
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  games: number;
  reports: number;
  changes: number;
  notificationsSent: number;
  notificationsSkipped: number;
  persisted: string[];
  sources: SourceReport[];
};

export type RawReport = Report & {
  name?: string;
  platform: Platform;
  conceptId?: string;
};

export type SearchEntry = {
  slug: string;
  name: string;
  ids: string[];
  platforms: Platform[];
  best: Status;
  updatedAt: string;
  reports: { emulator: EmulatorId; status: Status }[];
};
