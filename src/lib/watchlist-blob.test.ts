import assert from "node:assert/strict";
import test from "node:test";
import { BLOB_WATCHLIST_LEGACY } from "./paths";
import {
  isPrivateAccessRejected,
  loadWatchlistBlobText,
  storeWatchlistBlob,
  watchlistBlobPathname,
  type BlobGetResult,
  type WatchlistPutOptions,
} from "./watchlist-blob";

const SECRET = "watchlist-secret-not-a-pathname";

test("watchlist pathname is stable and unguessable", () => {
  const env = { WATCHLIST_BLOB_SECRET: SECRET, BLOB_READ_WRITE_TOKEN: "catalog-token" };
  const first = watchlistBlobPathname(env);
  const second = watchlistBlobPathname(env);
  assert.equal(first, second);
  assert.match(first ?? "", /^playableyet\/watch\/[a-f0-9]{64}\.json$/);
  assert.notEqual(first, BLOB_WATCHLIST_LEGACY);
  assert.equal(first?.includes(SECRET), false);
  assert.equal(first?.includes("catalog-token"), false);
  assert.notEqual(watchlistBlobPathname({ WATCHLIST_BLOB_SECRET: "other-secret" }), first);
  assert.equal(watchlistBlobPathname({}), null);
});

test("private access is preferred and a public store falls back off the legacy path", async () => {
  const puts: WatchlistPutOptions[] = [];
  const deleted: string[] = [];
  const pathname = watchlistBlobPathname({ WATCHLIST_BLOB_SECRET: SECRET }) ?? "";
  const access = await storeWatchlistBlob({
    pathname,
    body: '{"subscriptions":[]}',
    token: "token",
    access: null,
    put: async (path, _body, options) => {
      assert.equal(path, pathname);
      puts.push(options);
      if (options.access === "private") {
        throw new Error('Blob access "private" does not match store access "public".');
      }
    },
    del: async (path) => {
      deleted.push(path);
    },
  });
  assert.equal(access, "public");
  assert.deepEqual(
    puts.map((options) => options.access),
    ["private", "public"],
  );
  assert.deepEqual(deleted, [BLOB_WATCHLIST_LEGACY]);
  assert.equal(puts.some((options) => options.access === "public" && puts.length > 0), true);
});

test("an unrecognized blob error does not write a public watchlist", async () => {
  const puts: string[] = [];
  const pathname = watchlistBlobPathname({ WATCHLIST_BLOB_SECRET: SECRET }) ?? "";
  await assert.rejects(
    () =>
      storeWatchlistBlob({
        pathname,
        body: "{}",
        token: "token",
        put: async (_path, _body, options) => {
          puts.push(options.access);
          throw new Error("Unknown error, please visit https://vercel.com/help.");
        },
        del: async () => {
          throw new Error("should not delete after a failed write");
        },
      }),
    /Could not store the watchlist/,
  );
  assert.deepEqual(puts, ["private"]);
});

test("the legacy pathname is refused", async () => {
  await assert.rejects(
    () =>
      storeWatchlistBlob({
        pathname: BLOB_WATCHLIST_LEGACY,
        body: "{}",
        token: "token",
        put: async () => {
          throw new Error("should not put");
        },
        del: async () => undefined,
      }),
    /public pathname/,
  );
});

test("private rejection detection stays narrow", () => {
  assert.equal(
    isPrivateAccessRejected(new Error('Blob access "private" does not match store access "public".')),
    true,
  );
  assert.equal(isPrivateAccessRejected(new Error("Access denied, please provide a valid token for this resource.")), false);
  assert.equal(isPrivateAccessRejected(new Error("Unknown error, please visit https://vercel.com/help.")), false);
});

test("legacy watchlist is readable only so it can be moved", async () => {
  const pathname = watchlistBlobPathname({ WATCHLIST_BLOB_SECRET: SECRET }) ?? "";
  const seen: string[] = [];
  const loaded = await loadWatchlistBlobText({
    pathname,
    token: "token",
    get: async (path, options) => {
      seen.push(`${options.access}:${path}`);
      if (path === BLOB_WATCHLIST_LEGACY && options.access === "public") {
        const body = JSON.stringify({ subscriptions: [{ email: "a@example.com" }] });
        return { statusCode: 200, stream: new Response(body).body } satisfies BlobGetResult;
      }
      return null;
    },
  });
  assert.equal(loaded.fromLegacy, true);
  assert.match(loaded.text ?? "", /a@example.com/);
  assert.equal(seen.some((entry) => entry.endsWith(pathname)), true);
  assert.equal(seen.includes(`public:${BLOB_WATCHLIST_LEGACY}`), true);
});
