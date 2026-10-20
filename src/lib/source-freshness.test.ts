import assert from "node:assert/strict";
import test from "node:test";
import type { Catalog } from "./types";
import { readCatalogFile } from "./catalog-store";
import { asOfFromSyncReport, buildFreshness, explainSources, staleSourceMessages } from "./source-freshness";

const previous: Catalog = {
  generatedAt: "2026-10-18T06:43:39.529Z",
  games: [
    {
      slug: "bloodborne",
      name: "Bloodborne",
      titles: [{ id: "CUSA00900", platform: "ps4" }],
      reports: [
        {
          emulator: "fpps4",
          titleId: "CUSA00900",
          status: "menus",
          updatedAt: "2024-01-01",
          sourceUrl: "https://github.com/red-prig/fpps4-game-compatibility/issues/1",
        },
      ],
      history: [],
    },
  ],
};

test("a failed fpPS4 fetch keeps the previous report count and does not invent a fetch time", () => {
  const freshness = buildFreshness({
    fetched: [
      { id: "fpps4", ok: false, count: 0, error: "redirect loop" },
      { id: "rpcs3", ok: true, count: 3 },
    ],
    previousCatalog: previous,
    previousStatus: {
      generatedAt: previous.generatedAt,
      lastSyncAttemptAt: previous.generatedAt,
      lastSyncOk: true,
      gameCount: 1,
      sources: [{ id: "fpps4", ok: false, count: 0, asOf: null, carried: false }],
    },
    generatedAt: "2026-10-19T06:43:00.000Z",
  });
  assert.deepEqual(freshness[0], {
    id: "fpps4",
    ok: false,
    count: 1,
    asOf: null,
    carried: true,
  });
  assert.equal(freshness[1]?.asOf, "2026-10-19T06:43:00.000Z");
  assert.equal(freshness[1]?.carried, false);
  const message = staleSourceMessages(freshness, "2026-10-19T06:43:00.000Z")[0]?.message ?? "";
  assert.match(message, /fpPS4 could not be read/);
  assert.match(message, /1 report is kept/);
  assert.match(message, /time was not recorded/);
  assert.match(message, /That data is older than the snapshot from 2026-10-19 06:43 UTC/);
});

test("a successful fetch records the snapshot time and a later failure keeps it", () => {
  const success = buildFreshness({
    fetched: [{ id: "fpps4", ok: true, count: 4 }],
    previousCatalog: null,
    previousStatus: {
      generatedAt: null,
      lastSyncAttemptAt: null,
      lastSyncOk: null,
      gameCount: null,
      sources: [],
    },
    generatedAt: "2026-10-20T06:15:00.000Z",
  });
  assert.equal(success[0]?.asOf, "2026-10-20T06:15:00.000Z");
  assert.equal(success[0]?.carried, false);

  const failure = buildFreshness({
    fetched: [{ id: "fpps4", ok: false, count: 0, error: "redirect loop" }],
    previousCatalog: previous,
    previousStatus: {
      generatedAt: "2026-10-20T06:15:00.000Z",
      lastSyncAttemptAt: "2026-10-20T06:15:00.000Z",
      lastSyncOk: true,
      gameCount: 1,
      sources: [{ id: "fpps4", ok: true, count: 4, asOf: "2026-10-20T06:15:00.000Z", carried: false }],
    },
    generatedAt: "2026-10-21T06:15:00.000Z",
  });
  assert.equal(failure[0]?.asOf, "2026-10-20T06:15:00.000Z");
  assert.equal(failure[0]?.carried, true);
  assert.match(staleSourceMessages(failure, "2026-10-21T06:15:00.000Z")[0]?.message ?? "", /2026-10-20 06:15 UTC/);
});

test("a recorded sync report dates carried rows when the status blob has no asOf", () => {
  assert.equal(
    asOfFromSyncReport("fpps4", 2008, {
      finishedAt: "2026-10-16T04:27:33.605Z",
      sources: [{ id: "fpps4", ok: true, count: 2008 }],
    }),
    "2026-10-16T04:27:33.605Z",
  );
  assert.equal(
    asOfFromSyncReport("fpps4", 1, {
      finishedAt: "2026-10-16T04:27:33.605Z",
      sources: [{ id: "fpps4", ok: true, count: 2008 }],
    }),
    null,
  );

  const catalog = readCatalogFile();
  assert.ok(catalog);
  const explained = explainSources(
    {
      generatedAt: "2026-10-19T06:43:40.130Z",
      lastSyncAttemptAt: "2026-10-19T06:43:40.130Z",
      lastSyncOk: true,
      gameCount: catalog.games.length,
      sources: [{ id: "fpps4", ok: false, count: 0, asOf: null, carried: false }],
    },
    catalog,
  );
  const fpps4 = explained[0];
  assert.equal(fpps4?.count, 2008);
  assert.equal(fpps4?.carried, true);
  assert.equal(fpps4?.asOf, "2026-10-16T04:27:33.605Z");
  const message = staleSourceMessages([fpps4!], catalog.generatedAt)[0]?.message ?? "";
  assert.match(message, /2026-10-16 04:27 UTC/);
  assert.equal(message.includes("not recorded"), false);
});

test("the public status explains a failed source from the catalog it still serves", () => {
  const explained = explainSources(
    {
      generatedAt: "2026-10-18T06:43:39.529Z",
      lastSyncAttemptAt: "2026-10-18T06:43:39.529Z",
      lastSyncOk: true,
      gameCount: 1,
      sources: [
        { id: "rpcs3", ok: true, count: 10, asOf: null, carried: false },
        { id: "fpps4", ok: false, count: 0, asOf: null, carried: false },
      ],
    },
    previous,
  );
  assert.equal(explained[0]?.asOf, "2026-10-18T06:43:39.529Z");
  assert.equal(explained[1]?.count, 1);
  assert.equal(explained[1]?.carried, true);
  assert.equal(explained[1]?.asOf, null);
});
