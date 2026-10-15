import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import { put } from "@vercel/blob";
import type { Catalog, SearchEntry, SyncReport } from "@/lib/types";
import { BLOB_CATALOG, BLOB_SEARCH_INDEX, catalogPath, searchIndexPath, syncMetaPath } from "@/lib/paths";

export const EMPTY_CATALOG: Catalog = {
  generatedAt: "1970-01-01T00:00:00.000Z",
  games: [],
};

export function readCatalogFile(): Catalog | null {
  try {
    const parsed = JSON.parse(readFileSync(catalogPath, "utf8")) as Catalog;
    if (!parsed || !Array.isArray(parsed.games)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeJsonAtomic(filePath: string, value: unknown) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.tmp`;
  writeFileSync(temporary, JSON.stringify(value));
  renameSync(temporary, filePath);
}

export function writeCatalogFiles(catalog: Catalog, index: SearchEntry[], report: SyncReport) {
  writeJsonAtomic(catalogPath, catalog);
  writeJsonAtomic(searchIndexPath, index);
  writeJsonAtomic(syncMetaPath, report);
}

async function blobPut(pathname: string, body: string, access: "public" | "private") {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!token) return false;
  await put(pathname, body, {
    access,
    token,
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
    multipart: body.length > 4_000_000,
  });
  return true;
}

export async function publishSnapshot(catalog: Catalog, index: SearchEntry[]): Promise<string[]> {
  const persisted = ["data/catalog.json", "public/search-index.json", "data/sync-meta.json"];
  const catalogJson = JSON.stringify(catalog);
  const indexJson = JSON.stringify(index);
  if (await blobPut(BLOB_CATALOG, catalogJson, "public")) persisted.push(`blob:${BLOB_CATALOG}`);
  if (await blobPut(BLOB_SEARCH_INDEX, indexJson, "public")) persisted.push(`blob:${BLOB_SEARCH_INDEX}`);
  return persisted;
}

export async function readCatalogBlob(): Promise<Catalog | null> {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!token) return null;
  try {
    const { get } = await import("@vercel/blob");
    const result = await get(BLOB_CATALOG, { access: "public", token });
    if (!result || result.statusCode !== 200 || !result.stream) return null;
    const text = await new Response(result.stream).text();
    const parsed = JSON.parse(text) as Catalog;
    if (!Array.isArray(parsed.games)) return null;
    return parsed;
  } catch {
    return null;
  }
}
