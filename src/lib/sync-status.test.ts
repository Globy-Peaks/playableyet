import assert from "node:assert/strict";
import test from "node:test";
import { isReadOnlyWriteError } from "./catalog-store";
import { parsePublicSyncStatus, snapshotIsLive, syncSummaryLine } from "./sync-status";

test("a read-only filesystem error does not look like a logic error", () => {
  assert.equal(isReadOnlyWriteError(Object.assign(new Error("ro"), { code: "EROFS" })), true);
  assert.equal(isReadOnlyWriteError(Object.assign(new Error("denied"), { code: "EACCES" })), true);
  assert.equal(isReadOnlyWriteError(Object.assign(new Error("missing"), { code: "ENOENT" })), false);
});

test("public sync status drops emails and tokens", () => {
  const parsed = parsePublicSyncStatus({
    generatedAt: "2026-10-17T06:15:00.000Z",
    lastSyncAttemptAt: "2026-10-17T06:15:00.000Z",
    lastSyncOk: true,
    gameCount: 3,
    sources: [{ id: "rpcs3", ok: true, count: 2, error: "Bearer secret-token" }],
    email: "person@example.com",
    token: "watch-token",
  });
  assert.deepEqual(parsed, {
    generatedAt: "2026-10-17T06:15:00.000Z",
    lastSyncAttemptAt: "2026-10-17T06:15:00.000Z",
    lastSyncOk: true,
    gameCount: 3,
    sources: [{ id: "rpcs3", ok: true, count: 2 }],
  });
  assert.equal(JSON.stringify(parsed).includes("secret-token"), false);
  assert.equal(JSON.stringify(parsed).includes("person@example.com"), false);
});

test("production only treats a blob catalog as a live snapshot", () => {
  const previous = process.env.VERCEL;
  process.env.VERCEL = "1";
  assert.equal(snapshotIsLive(["data/catalog.json"]), false);
  assert.equal(snapshotIsLive(["blob:playableyet/catalog.json"]), true);
  if (previous === undefined) delete process.env.VERCEL;
  else process.env.VERCEL = previous;
});

test("the cron summary is one line and has no address", () => {
  const line = syncSummaryLine({
    ok: false,
    games: 6049,
    generatedAt: "2026-10-16T04:27:08.674Z",
    sources: [
      { id: "rpcs3", ok: true },
      { id: "shadps4", ok: false },
    ],
    persisted: [],
    reason: "exception",
  });
  assert.equal(line.includes("\n"), false);
  assert.match(line, /^PlayableYet sync summary ok=false /);
  assert.match(line, /sources=rpcs3:ok,shadps4:failed/);
  assert.match(line, /persisted=none/);
  assert.match(line, /reason=exception/);
  assert.equal(line.includes("@"), false);
});
