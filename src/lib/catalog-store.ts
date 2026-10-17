import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import { put } from "@vercel/blob";
import type { Catalog, SearchEntry, SyncReport } from "@/lib/types";
import {
  BLOB_CATALOG,
  BLOB_SEARCH_INDEX,
  catalogPath,
  searchIndexPath,
  syncMetaPath,
} from "@/lib/paths";

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

export function isReadOnlyWriteError(error: unknown): boolean {
  const code =
    typeof error === "object" && error && "code" in error ? String((error as { code: unknown }).code) : "";
  return code === "EROFS" || code === "EACCES" || code === "EPERM";
}

export function tryWriteJson(filePath: string, value: unknown): boolean {
  try {
    writeJsonAtomic(filePath, value);
    return true;
  } catch (error) {
    if (!isReadOnlyWriteError(error)) throw error;
    const code =
      typeof error === "object" && error && "code" in error ? String((error as { code: unknown }).code) : "error";
    console.log(`PlayableYet local write skipped path=${path.basename(filePath)} code=${code}`);
    return false;
  }
}

export function writeCatalogFiles(catalog: Catalog, index: SearchEntry[], report: SyncReport): string[] {
  const wrote: string[] = [];
  if (tryWriteJson(catalogPath, catalog)) wrote.push("data/catalog.json");
  if (tryWriteJson(searchIndexPath, index)) wrote.push("data/search-index.json");
  if (tryWriteJson(syncMetaPath, report)) wrote.push("data/sync-meta.json");
  return wrote;
}

export async function writePublicBlob(pathname: string, body: string): Promise<boolean> {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!token) return false;
  try {
    await put(pathname, body, {
      access: "public",
      token,
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
      cacheControlMaxAge: 60,
      multipart: body.length > 4_000_000,
    });
    return true;
  } catch (error) {
    const code =
      typeof error === "object" && error && "code" in error ? String((error as { code: unknown }).code) : "error";
    console.log(`PlayableYet blob write failed pathname=${pathname} code=${code}`);
    return false;
  }
}

export async function publishSnapshot(catalog: Catalog, index: SearchEntry[]): Promise<string[]> {
  const persisted: string[] = [];
  const catalogJson = JSON.stringify(catalog);
  const indexJson = JSON.stringify(index);
  if (await writePublicBlob(BLOB_CATALOG, catalogJson)) persisted.push(`blob:${BLOB_CATALOG}`);
  if (await writePublicBlob(BLOB_SEARCH_INDEX, indexJson)) persisted.push(`blob:${BLOB_SEARCH_INDEX}`);
  return persisted;
}

export async function readPublicBlobJson(pathname: string): Promise<unknown | null> {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!token) return null;
  try {
    const { get } = await import("@vercel/blob");
    const result = await get(pathname, { access: "public", token, useCache: false });
    if (!result || result.statusCode !== 200 || !result.stream) return null;
    const text = await new Response(result.stream).text();
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

export async function readCatalogBlob(): Promise<Catalog | null> {
  const parsed = await readPublicBlobJson(BLOB_CATALOG);
  if (!parsed || typeof parsed !== "object") return null;
  const catalog = parsed as Catalog;
  if (!Array.isArray(catalog.games) || typeof catalog.generatedAt !== "string") return null;
  return catalog;
}
