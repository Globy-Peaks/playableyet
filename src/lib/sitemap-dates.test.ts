import assert from "node:assert/strict";
import test from "node:test";
import { readCatalogFile } from "./catalog-store";
import { gameLastModified } from "./sitemap-dates";
import type { HistoryEvent } from "./types";

const snapshot = "2026-10-18T06:43:39.529Z";

test("a game with no status change uses the snapshot time", () => {
  const history: HistoryEvent[] = [
    { emulator: "shadps4", titleId: "CUSA00001", status: "nothing", at: "2026-10-01", initial: true },
  ];
  assert.equal(gameLastModified(history, snapshot), snapshot);
});

test("a game uses the latest real status change", () => {
  const history: HistoryEvent[] = [
    { emulator: "shadps4", titleId: "CUSA00001", status: "nothing", at: "2026-10-01", initial: true },
    {
      emulator: "shadps4",
      titleId: "CUSA00001",
      status: "ingame",
      from: "nothing",
      at: "2026-10-16",
      initial: false,
    },
  ];
  assert.equal(gameLastModified(history, snapshot), "2026-10-16");
});

test("Knack 2 in the committed snapshot has a real change date", () => {
  const catalog = readCatalogFile();
  assert.ok(catalog);
  const game = catalog.games.find((item) => item.slug === "knack-2");
  assert.ok(game);
  const lastmod = gameLastModified(game.history, catalog.generatedAt);
  assert.notEqual(lastmod, catalog.generatedAt);
  assert.match(lastmod, /^2026-10-16/);
});
