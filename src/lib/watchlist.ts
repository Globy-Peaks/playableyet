import { readFileSync } from "node:fs";
import { randomBytes, randomUUID } from "node:crypto";
import { del, get, put } from "@vercel/blob";
import { BLOB_WATCHLIST_LEGACY, watchlistPath } from "@/lib/paths";
import { writeJsonAtomic } from "@/lib/catalog-store";
import {
  isSoftBlobMiss,
  loadWatchlistBlobText,
  storeWatchlistBlob,
  watchlistBlobPathname,
  watchlistBlobToken,
  type BlobAccessMode,
} from "@/lib/watchlist-blob";

export type Subscription = {
  id: string;
  email: string;
  slug: string;
  gameName: string;
  status: "pending" | "confirmed";
  confirmToken: string;
  unsubToken: string;
  createdAt: string;
  confirmedAt?: string;
  notified: { emulator: string; at: string }[];
};

type WatchStore = { subscriptions: Subscription[] };

const EMPTY: WatchStore = { subscriptions: [] };

let queue: Promise<unknown> = Promise.resolve();

function exclusive<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

let blobAccess: BlobAccessMode | null = null;

function parseStore(text: string): WatchStore {
  let parsed: WatchStore;
  try {
    parsed = JSON.parse(text) as WatchStore;
  } catch {
    throw new Error("Could not store the watchlist. The saved file was not valid JSON.");
  }
  if (!parsed || !Array.isArray(parsed.subscriptions)) {
    throw new Error("Could not store the watchlist. The saved file was not a watchlist.");
  }
  return parsed;
}

async function readBlob(): Promise<WatchStore | null> {
  const token = watchlistBlobToken();
  const pathname = watchlistBlobPathname();
  if (!token || !pathname) return null;
  const loaded = await loadWatchlistBlobText({
    pathname,
    token,
    access: blobAccess,
    get: (path, options) => get(path, options),
    legacyPathname: BLOB_WATCHLIST_LEGACY,
  });
  blobAccess = loaded.access;
  if (loaded.text === null) {
    await deleteLegacy();
    return null;
  }
  const store = parseStore(loaded.text);
  if (loaded.fromLegacy) await writeBlob(store);
  else await deleteLegacy();
  return store;
}

function blobTokens(): string[] {
  const catalog = process.env.BLOB_READ_WRITE_TOKEN?.trim() || "";
  return [...new Set([watchlistBlobToken(), catalog].filter(Boolean))];
}

async function deleteLegacy() {
  for (const token of blobTokens()) {
    try {
      await del(BLOB_WATCHLIST_LEGACY, { token });
    } catch (error) {
      if (!isSoftBlobMiss(error)) console.error("Could not delete the legacy watchlist blob.");
    }
  }
}

function readFile(): WatchStore | null {
  try {
    const parsed = JSON.parse(readFileSync(watchlistPath, "utf8")) as WatchStore;
    if (!Array.isArray(parsed.subscriptions)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function readWatchlist(): Promise<WatchStore> {
  return (await readBlob()) ?? readFile() ?? EMPTY;
}

async function writeWatchlist(store: WatchStore) {
  let fileError: unknown;
  try {
    writeJsonAtomic(watchlistPath, store);
  } catch (error) {
    fileError = error;
  }
  if (await writeBlob(store)) return;
  if (fileError) throw fileError;
}

async function writeBlob(store: WatchStore): Promise<boolean> {
  const token = watchlistBlobToken();
  const pathname = watchlistBlobPathname();
  if (!token || !pathname) return false;
  blobAccess = await storeWatchlistBlob({
    pathname,
    body: JSON.stringify(store),
    token,
    access: blobAccess,
    legacyPathname: BLOB_WATCHLIST_LEGACY,
    put: (path, body, options) => put(path, body, options),
    del: (path, options) => del(path, options),
  });
  await deleteLegacy();
  return true;
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

export async function subscribe(input: { email: string; slug: string; gameName: string }) {
  return exclusive(async () => {
    const email = normalizeEmail(input.email);
    const store = await readWatchlist();
    const existing = store.subscriptions.find(
      (item) => item.email === email && item.slug === input.slug,
    );
    if (existing) return existing;
    const created: Subscription = {
      id: randomUUID(),
      email,
      slug: input.slug,
      gameName: input.gameName,
      status: "pending",
      confirmToken: randomBytes(24).toString("hex"),
      unsubToken: randomBytes(24).toString("hex"),
      createdAt: new Date().toISOString(),
      notified: [],
    };
    store.subscriptions.push(created);
    await writeWatchlist(store);
    return created;
  });
}

export async function confirmSubscription(confirmToken: string) {
  return exclusive(async () => {
    const store = await readWatchlist();
    const found = store.subscriptions.find((item) => item.confirmToken === confirmToken);
    if (!found) return null;
    if (found.status !== "confirmed") {
      found.status = "confirmed";
      found.confirmedAt = new Date().toISOString();
      await writeWatchlist(store);
    }
    return found;
  });
}

export async function unsubscribe(unsubToken: string) {
  return exclusive(async () => {
    const store = await readWatchlist();
    const index = store.subscriptions.findIndex((item) => item.unsubToken === unsubToken);
    if (index < 0) return null;
    const [removed] = store.subscriptions.splice(index, 1);
    await writeWatchlist(store);
    return removed;
  });
}

export async function updateWatchlist(mutate: (store: WatchStore) => void) {
  return exclusive(async () => {
    const store = await readWatchlist();
    mutate(store);
    await writeWatchlist(store);
    return store;
  });
}
