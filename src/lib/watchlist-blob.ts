import { createHash } from "node:crypto";
import { BLOB_CATALOG, BLOB_SEARCH_INDEX, BLOB_WATCHLIST_LEGACY } from "@/lib/paths";

export const WATCHLIST_PATH_PREFIX = "playableyet/watch/";

const PUBLIC_PATHS = new Set<string>([BLOB_CATALOG, BLOB_SEARCH_INDEX, BLOB_WATCHLIST_LEGACY]);

export type BlobAccessMode = "private" | "public";

export type WatchlistPutOptions = {
  access: BlobAccessMode;
  token: string;
  addRandomSuffix: false;
  allowOverwrite: true;
  contentType: "application/json";
  cacheControlMaxAge: number;
};

type PutFn = (pathname: string, body: string, options: WatchlistPutOptions) => Promise<unknown>;
type DelFn = (pathname: string, options: { token: string }) => Promise<void>;

export type BlobGetResult = {
  statusCode: number;
  stream: ReadableStream<Uint8Array> | null;
};

type GetFn = (
  pathname: string,
  options: { access: BlobAccessMode; token: string; useCache?: boolean },
) => Promise<BlobGetResult | null>;

export type WatchlistEnv = {
  WATCHLIST_BLOB_SECRET?: string;
  WATCHLIST_BLOB_READ_WRITE_TOKEN?: string;
  BLOB_READ_WRITE_TOKEN?: string;
};

/**
 * Unguessable pathname for watchlist emails and tokens.
 * Prefer WATCHLIST_BLOB_SECRET so rotating the Blob token does not orphan the file.
 */
export function watchlistBlobPathname(env?: WatchlistEnv): string | null {
  const source = env ?? (process.env as WatchlistEnv);
  const secret =
    source.WATCHLIST_BLOB_SECRET?.trim() ||
    source.WATCHLIST_BLOB_READ_WRITE_TOKEN?.trim() ||
    source.BLOB_READ_WRITE_TOKEN?.trim() ||
    "";
  if (!secret) return null;
  const digest = createHash("sha256").update("playableyet-watchlist-v1\0").update(secret).digest("hex");
  const pathname = `${WATCHLIST_PATH_PREFIX}${digest}.json`;
  assertWatchlistPath(pathname);
  return pathname;
}

export function watchlistBlobToken(env?: WatchlistEnv): string {
  const source = env ?? (process.env as WatchlistEnv);
  return source.WATCHLIST_BLOB_READ_WRITE_TOKEN?.trim() || source.BLOB_READ_WRITE_TOKEN?.trim() || "";
}

export function assertWatchlistPath(pathname: string) {
  if (PUBLIC_PATHS.has(pathname) || !pathname.startsWith(WATCHLIST_PATH_PREFIX) || pathname.includes("..")) {
    throw new Error("Refusing to store watchlist data on a public pathname.");
  }
}

/** True when the store rejected private access because it is a public store. */
export function isPrivateAccessRejected(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  if (!message.includes("private") || !message.includes("public")) return false;
  return (
    message.includes("access") ||
    message.includes("store") ||
    message.includes("match") ||
    message.includes("support")
  );
}

export function isSoftBlobMiss(error: unknown): boolean {
  if (isPrivateAccessRejected(error)) return true;
  if (!(error instanceof Error)) return false;
  if (/404|401|403|does not exist|not found/i.test(error.message)) return true;
  return /failed to fetch blob: 4\d\d/i.test(error.message);
}

export function watchlistPutOptions(token: string, access: BlobAccessMode): WatchlistPutOptions {
  return {
    access,
    token,
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
    cacheControlMaxAge: 60,
  };
}

export async function storeWatchlistBlob(input: {
  pathname: string;
  body: string;
  token: string;
  put: PutFn;
  del: DelFn;
  legacyPathname?: string;
  access?: BlobAccessMode | null;
}): Promise<BlobAccessMode> {
  const legacy = input.legacyPathname ?? BLOB_WATCHLIST_LEGACY;
  assertWatchlistPath(input.pathname);
  let access: BlobAccessMode | null = input.access ?? null;
  if (access !== "public") {
    try {
      await input.put(input.pathname, input.body, watchlistPutOptions(input.token, "private"));
      access = "private";
    } catch (error) {
      if (!isPrivateAccessRejected(error)) throw redactBlobError(error);
      access = "public";
    }
  }
  if (access === "public") {
    try {
      await input.put(input.pathname, input.body, watchlistPutOptions(input.token, "public"));
    } catch (error) {
      throw redactBlobError(error);
    }
  }
  if (legacy !== input.pathname) {
    try {
      await input.del(legacy, { token: input.token });
    } catch (error) {
      if (!isSoftBlobMiss(error)) console.error("Could not delete the legacy watchlist blob.");
    }
  }
  return access ?? "private";
}

export async function loadWatchlistBlobText(input: {
  pathname: string;
  token: string;
  get: GetFn;
  legacyPathname?: string;
  access?: BlobAccessMode | null;
}): Promise<{ text: string | null; access: BlobAccessMode | null; fromLegacy: boolean }> {
  const legacy = input.legacyPathname ?? BLOB_WATCHLIST_LEGACY;
  assertWatchlistPath(input.pathname);
  const primary = await readBlobText(input.get, input.pathname, input.token, input.access ?? null);
  if (primary.text !== null) return { text: primary.text, access: primary.access, fromLegacy: false };
  if (legacy === input.pathname) return { text: null, access: primary.access, fromLegacy: false };
  const old = await readBlobText(input.get, legacy, input.token, null);
  return { text: old.text, access: old.access ?? primary.access, fromLegacy: old.text !== null };
}

async function readBlobText(
  get: GetFn,
  pathname: string,
  token: string,
  prefer: BlobAccessMode | null,
): Promise<{ text: string | null; access: BlobAccessMode | null }> {
  const order: BlobAccessMode[] = prefer === "public" ? ["public", "private"] : ["private", "public"];
  let hardError: unknown = null;
  for (const access of order) {
    try {
      const result = await get(pathname, { access, token, useCache: false });
      if (!result || result.statusCode !== 200 || !result.stream) continue;
      return { text: await new Response(result.stream).text(), access };
    } catch (error) {
      if (isSoftBlobMiss(error)) continue;
      hardError = error;
      if (access === "private") continue;
      break;
    }
  }
  if (hardError) throw redactBlobError(hardError);
  return { text: null, access: prefer };
}

function redactBlobError(error: unknown): Error {
  const message = error instanceof Error ? error.message : "Blob request failed";
  const redacted = message
    .replace(/playableyet\/watch\/[a-f0-9]+\.json/gi, "playableyet/watch/[redacted]")
    .replace(/https?:\/\/\S+/g, "[redacted-url]");
  return new Error(`Could not store the watchlist. ${redacted}`);
}
