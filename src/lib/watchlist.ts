import { readFileSync } from "node:fs";
import { randomBytes, randomUUID } from "node:crypto";
import { get, put } from "@vercel/blob";
import { BLOB_WATCHLIST, watchlistPath } from "@/lib/paths";
import { writeJsonAtomic } from "@/lib/catalog-store";

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

function token() {
  return process.env.BLOB_READ_WRITE_TOKEN?.trim() || "";
}

async function readBlob(): Promise<WatchStore | null> {
  const blobToken = token();
  if (!blobToken) return null;
  const result = await get(BLOB_WATCHLIST, {
    access: "private",
    token: blobToken,
    useCache: false,
  });
  if (!result || result.statusCode !== 200 || !result.stream) return null;
  const parsed = JSON.parse(await new Response(result.stream).text()) as WatchStore;
  if (!Array.isArray(parsed.subscriptions)) return null;
  return parsed;
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
  const blobToken = token();
  if (blobToken) {
    await put(BLOB_WATCHLIST, JSON.stringify(store), {
      access: "private",
      token: blobToken,
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
    });
    return;
  }
  if (fileError) throw fileError;
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
