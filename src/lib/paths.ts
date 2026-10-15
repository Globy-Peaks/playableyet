import path from "node:path";

export const dataDir = path.join(process.cwd(), "data");
export const catalogPath = path.join(dataDir, "catalog.json");
export const syncMetaPath = path.join(dataDir, "sync-meta.json");
export const watchlistPath = path.join(dataDir, "watchlist.json");
export const searchIndexPath = path.join(process.cwd(), "public", "search-index.json");

export const BLOB_CATALOG = "playableyet/catalog.json";
export const BLOB_WATCHLIST = "playableyet/watchlist.json";
export const BLOB_SEARCH_INDEX = "playableyet/search-index.json";
