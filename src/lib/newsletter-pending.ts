import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { get, put } from "@vercel/blob";
import { tryWriteJson } from "@/lib/catalog-store";
import { newsletterPendingPath } from "@/lib/paths";
import {
  isPrivateAccessRejected,
  isSoftBlobMiss,
  watchlistPutOptions,
  type BlobAccessMode,
} from "@/lib/watchlist-blob";

export type PendingSignup = {
  email: string;
  token: string;
  consentAt: string;
  createdAt: string;
  expiresAt: string;
  sendAt: string[];
};

const PREFIX = "playableyet/newsletter/";

let queue: Promise<unknown> = Promise.resolve();
let blobAccess: BlobAccessMode | null = null;

export function exclusive<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

/** Unguessable pathname, separate from the watchlist and the public catalog. */
export function newsletterPendingPathname(secret: string): string | null {
  if (!secret.trim()) return null;
  const digest = createHash("sha256").update("playableyet-newsletter-pending-v1\0").update(secret).digest("hex");
  const pathname = `${PREFIX}${digest}.json`;
  if (!pathname.startsWith(PREFIX) || pathname.includes("..") || pathname.includes("catalog") || pathname.includes("watch")) {
    throw new Error("Refusing to store newsletter data on a public pathname.");
  }
  return pathname;
}

export function parsePendingStore(text: string): PendingSignup[] {
  let parsed: { pending?: unknown };
  try {
    parsed = JSON.parse(text) as { pending?: unknown };
  } catch {
    throw new Error("Could not read the newsletter confirmation list.");
  }
  if (!parsed || !Array.isArray(parsed.pending)) {
    throw new Error("Could not read the newsletter confirmation list.");
  }
  return parsed.pending.filter(isPendingSignup);
}

function isPendingSignup(value: unknown): value is PendingSignup {
  if (!value || typeof value !== "object") return false;
  const row = value as PendingSignup;
  return (
    typeof row.email === "string" &&
    typeof row.token === "string" &&
    typeof row.consentAt === "string" &&
    typeof row.createdAt === "string" &&
    typeof row.expiresAt === "string" &&
    Array.isArray(row.sendAt) &&
    row.sendAt.every((at) => typeof at === "string")
  );
}

function blobToken(): string {
  return process.env.BLOB_READ_WRITE_TOKEN?.trim() || "";
}

function readFile(): PendingSignup[] | null {
  try {
    return parsePendingStore(readFileSync(newsletterPendingPath, "utf8"));
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? String((error as { code: unknown }).code) : "";
    if (code === "ENOENT") return null;
    if (error instanceof Error && error.message.startsWith("Could not read")) throw error;
    throw new Error("Could not read the newsletter confirmation list.");
  }
}

async function readBlob(): Promise<PendingSignup[] | null> {
  const token = blobToken();
  const pathname = token ? newsletterPendingPathname(token) : null;
  if (!token || !pathname) return null;
  const order: BlobAccessMode[] = blobAccess === "public" ? ["public", "private"] : ["private", "public"];
  for (const access of order) {
    try {
      const result = await get(pathname, { access, token, useCache: false });
      if (!result || result.statusCode !== 200 || !result.stream) continue;
      blobAccess = access;
      return parsePendingStore(await new Response(result.stream).text());
    } catch (error) {
      if (isSoftBlobMiss(error)) continue;
      throw new Error("Could not read the newsletter confirmation list.");
    }
  }
  return null;
}

export async function readPending(): Promise<PendingSignup[]> {
  const stored = await readBlob();
  if (stored) return stored;
  return readFile() ?? [];
}

async function writeBlob(body: string): Promise<boolean> {
  const token = blobToken();
  const pathname = token ? newsletterPendingPathname(token) : null;
  if (!token || !pathname) return false;
  if (blobAccess !== "public") {
    try {
      await put(pathname, body, watchlistPutOptions(token, "private"));
      blobAccess = "private";
      return true;
    } catch (error) {
      if (!isPrivateAccessRejected(error)) {
        console.error("PlayableYet newsletter pending blob write failed");
        return false;
      }
      blobAccess = "public";
    }
  }
  try {
    await put(pathname, body, watchlistPutOptions(token, "public"));
    return true;
  } catch {
    console.error("PlayableYet newsletter pending blob write failed");
    return false;
  }
}

export async function persistPending(rows: PendingSignup[]): Promise<boolean> {
  const fileOk = tryWriteJson(newsletterPendingPath, { pending: rows });
  const blobOk = await writeBlob(JSON.stringify({ pending: rows }));
  return fileOk || blobOk;
}
