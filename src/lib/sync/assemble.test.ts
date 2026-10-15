import assert from "node:assert/strict";
import test from "node:test";
import type { RawReport } from "../types";
import { assembleCatalog } from "./assemble";

const reports: RawReport[] = [
  {
    emulator: "shadps4",
    titleId: "CUSA00038",
    name: "RESOGUN",
    platform: "ps4",
    status: "playable",
    updatedAt: "2026-10-15",
    sourceUrl: "https://github.com/shadps4-compatibility/shadps4-game-compatibility/issues/1",
    conceptId: "203706",
  },
  {
    emulator: "fpps4",
    titleId: "CUSA00005",
    name: "RESOGUN",
    platform: "ps4",
    status: "ingame",
    updatedAt: "2024-01-02",
    sourceUrl: "https://github.com/red-prig/fpps4-game-compatibility/issues/2",
    conceptId: "203706",
  },
  {
    emulator: "anyps5",
    titleId: "PPSA02929",
    name: "Dreaming Sarah",
    platform: "ps5",
    status: "playable",
    updatedAt: "2026-10-10",
    sourceUrl: "https://github.com/boykopovar/AnyPS5",
    note: "Officially confirmed.",
  },
];

test("groups regional releases and keeps anyps5 playable separate", () => {
  const titles = new Map([
    ["CUSA00038", { name: "RESOGUN", conceptId: "203706", regionRank: 0 }],
    ["CUSA00005", { name: "RESOGUN", conceptId: "203706", regionRank: 2 }],
  ]);
  const { catalog, changes } = assembleCatalog(reports, titles, null, "2026-10-15T00:00:00.000Z");
  assert.equal(changes, 0);
  assert.equal(catalog.games.length, 2);
  const resogun = catalog.games.find((game) => game.name.toLowerCase().includes("resogun"));
  assert.ok(resogun);
  assert.deepEqual(
    resogun.titles.map((title) => title.id).sort(),
    ["CUSA00005", "CUSA00038"],
  );
  assert.equal(resogun.reports.length, 2);
  assert.equal(resogun.history.every((event) => event.initial), true);
  const sarah = catalog.games.find((game) => game.slug === "dreaming-sarah");
  assert.equal(sarah?.reports[0]?.status, "playable");
});

test("appends history when a later snapshot changes status", () => {
  const titles = new Map<string, { name: string; conceptId?: string; regionRank: number }>();
  const first = assembleCatalog(
    [reports[2]],
    titles,
    null,
    "2026-10-10T00:00:00.000Z",
  ).catalog;
  const changed: RawReport = { ...reports[2], status: "in-bring-up", updatedAt: "2026-10-16" };
  const second = assembleCatalog([changed], titles, first, "2026-10-16T00:00:00.000Z");
  assert.equal(second.changes, 1);
  const events = second.catalog.games[0]?.history ?? [];
  assert.equal(events.at(-1)?.from, "playable");
  assert.equal(events.at(-1)?.status, "in-bring-up");
  assert.equal(events.at(-1)?.initial, false);
});
