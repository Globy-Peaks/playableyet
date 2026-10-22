import assert from "node:assert/strict";
import test from "node:test";
import { newlyPlayable, recentlyPlayable, statusChanges } from "./feeds";
import type { Catalog, Game } from "./types";

function game(partial: Pick<Game, "slug" | "name" | "reports" | "history"> & Partial<Pick<Game, "titles">>): Game {
  return {
    titles: partial.titles ?? [],
    ...partial,
  };
}

const generatedAt = "2026-10-21T06:43:00.000Z";

test("newly playable sorts by the day the status changed, newest first", () => {
  const catalog: Catalog = {
    generatedAt,
    games: [
      game({
        slug: "older-source-date",
        name: "Alpha",
        reports: [
          {
            emulator: "rpcs3",
            titleId: "BLUS00001",
            status: "playable",
            updatedAt: "2026-10-21",
            sourceUrl: "https://rpcs3.net/compatibility?g=BLUS00001",
          },
        ],
        history: [
          { emulator: "rpcs3", titleId: "BLUS00001", status: "ingame", at: "2026-09-01", initial: true },
          {
            emulator: "rpcs3",
            titleId: "BLUS00001",
            status: "playable",
            from: "ingame",
            at: "2026-10-18",
            initial: false,
          },
        ],
      }),
      game({
        slug: "newer-change",
        name: "Zulu",
        reports: [
          {
            emulator: "shadps4",
            titleId: "CUSA00001",
            status: "playable",
            updatedAt: "2026-10-19",
            sourceUrl: "https://github.com/shadps4-compatibility/shadps4-game-compatibility/issues/1",
          },
        ],
        history: [
          { emulator: "shadps4", titleId: "CUSA00001", status: "ingame", at: "2026-10-01", initial: true },
          {
            emulator: "shadps4",
            titleId: "CUSA00001",
            status: "playable",
            from: "ingame",
            at: "2026-10-21",
            initial: false,
          },
        ],
      }),
      game({
        slug: "bumped-issue",
        name: "Middle",
        reports: [
          {
            emulator: "shadps4",
            titleId: "CUSA00002",
            status: "playable",
            updatedAt: "2026-10-21",
            sourceUrl: "https://github.com/shadps4-compatibility/shadps4-game-compatibility/issues/2",
          },
        ],
        history: [
          { emulator: "shadps4", titleId: "CUSA00002", status: "playable", at: "2026-01-01", initial: true },
        ],
      }),
    ],
  };
  const items = newlyPlayable(catalog);
  assert.deepEqual(
    items.map((item) => item.slug),
    ["newer-change", "older-source-date"],
  );
  assert.equal(items[0]?.at, "2026-10-21");
  assert.equal(items[1]?.at, "2026-10-18");
});

test("status changes group editions of one game and keep a different day separate", () => {
  const catalog: Catalog = {
    generatedAt,
    games: [
      game({
        slug: "bioshock",
        name: "BioShock",
        titles: [
          { id: "BLES00316", platform: "ps3" },
          { id: "BLUS30166", platform: "ps3", region: "UP" },
        ],
        reports: [],
        history: [
          {
            emulator: "rpcs3",
            titleId: "BLUS30166",
            status: "playable",
            from: "ingame",
            at: "2026-10-21",
            initial: false,
          },
          {
            emulator: "rpcs3",
            titleId: "BLES00316",
            status: "playable",
            from: "ingame",
            at: "2026-10-21",
            initial: false,
          },
          {
            emulator: "rpcs3",
            titleId: "BLUS30166",
            status: "playable",
            from: "ingame",
            at: "2026-10-17",
            initial: false,
          },
          { emulator: "rpcs3", titleId: "NPEB00772", status: "ingame", at: "2022-04-11", initial: true },
        ],
      }),
    ],
  };
  const items = statusChanges(catalog);
  assert.equal(items.length, 2);
  assert.equal(items[0]?.at, "2026-10-21");
  assert.deepEqual(
    items[0]?.editions.map((edition) => edition.id),
    ["BLES00316", "BLUS30166"],
  );
  assert.equal(items[0]?.editions[1]?.region, "UP");
  assert.deepEqual(
    items[1]?.editions.map((edition) => edition.id),
    ["BLUS30166"],
  );
  assert.equal(items[1]?.at, "2026-10-17");
  assert.deepEqual(
    recentlyPlayable(catalog, "rpcs3").map((item) => item.at),
    ["2026-10-21", "2026-10-17"],
  );
  assert.equal(recentlyPlayable(catalog, "shadps4").length, 0);
});
