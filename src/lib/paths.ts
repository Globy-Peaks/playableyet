import path from "node:path";

export const dataDir = path.join(process.cwd(), "data");
export const catalogPath = path.join(dataDir, "catalog.json");
export const syncMetaPath = path.join(dataDir, "sync-meta.json");
export const watchlistPath = path.join(dataDir, "watchlist.json");
export const newsletterPendingPath = path.join(dataDir, "newsletter-pending.json");
export const searchIndexPath = path.join(dataDir, "search-index.json");
export const syncStatusPath = path.join(dataDir, "sync-status.json");

export const BLOB_CATALOG = "playableyet/catalog.json";
export const BLOB_SEARCH_INDEX = "playableyet/search-index.json";
export const BLOB_SYNC_STATUS = "playableyet/sync-status.json";
/** Older builds wrote emails here. The name is public. Never write it again. */
export const BLOB_WATCHLIST_LEGACY = "playableyet/watchlist.json";
