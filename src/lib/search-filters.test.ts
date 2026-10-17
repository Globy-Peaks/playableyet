import assert from "node:assert/strict";
import test from "node:test";
import { readCatalogFile } from "./catalog-store";
import { emulatorPlatform } from "./emulators";
import { matchesSearchFilters } from "./search-filters";
import { toSearchIndex } from "./sync/assemble";
import { EMULATOR_IDS, PLATFORMS, STATUSES, type SearchEntry } from "./types";

function entry(partial: Partial<SearchEntry> & Pick<SearchEntry, "reports" | "platforms">): SearchEntry {
  return {
    slug: partial.slug ?? "game",
    name: partial.name ?? "Game",
    ids: partial.ids ?? ["CUSA00001"],
    platforms: partial.platforms,
    best: partial.best ?? "nothing",
    updatedAt: partial.updatedAt ?? "2026-10-16",
    reports: partial.reports,
  };
}

const crossPlatform = entry({
  slug: "ape-escape",
  name: "Ape Escape",
  platforms: ["ps3", "ps5"],
  best: "playable",
  reports: [
    { emulator: "rpcs3", status: "playable" },
    { emulator: "anyps5", status: "in-bring-up" },
    { emulator: "kytyps5", status: "nothing" },
  ],
});

const sarah = entry({
  slug: "dreaming-sarah",
  name: "Dreaming Sarah",
  ids: ["PPSA02929"],
  platforms: ["ps5"],
  best: "playable",
  reports: [
    { emulator: "anyps5", status: "playable" },
    { emulator: "kytyps5", status: "ingame" },
    { emulator: "sharpemu", status: "playable" },
  ],
});

test("project and status have to be the same report", () => {
  assert.equal(matchesSearchFilters(crossPlatform, { emulator: "anyps5", status: "playable" }), false);
  assert.equal(matchesSearchFilters(crossPlatform, { emulator: "anyps5", status: "in-bring-up" }), true);
  assert.equal(matchesSearchFilters(crossPlatform, { emulator: "rpcs3", status: "playable" }), true);
  assert.equal(matchesSearchFilters(sarah, { emulator: "anyps5", status: "playable" }), true);
  assert.equal(matchesSearchFilters(sarah, { emulator: "kytyps5", status: "playable" }), false);
  assert.equal(matchesSearchFilters(sarah, { emulator: "kytyps5", status: "ingame" }), true);
});

test("platform and status have to be the same report", () => {
  assert.equal(matchesSearchFilters(crossPlatform, { platform: "ps5", status: "playable" }), false);
  assert.equal(matchesSearchFilters(crossPlatform, { platform: "ps3", status: "playable" }), true);
  assert.equal(matchesSearchFilters(crossPlatform, { platform: "ps5", status: "in-bring-up" }), true);
  assert.equal(matchesSearchFilters(sarah, { platform: "ps5", status: "playable" }), true);
  assert.equal(matchesSearchFilters(sarah, { platform: "ps4", status: "playable" }), false);
  assert.equal(matchesSearchFilters(crossPlatform, { platform: "ps5", emulator: "rpcs3" }), false);
  assert.equal(matchesSearchFilters(crossPlatform, { platform: "ps5", emulator: "anyps5", status: "in-bring-up" }), true);
});

test("a platform with no project or status still lists that console", () => {
  assert.equal(matchesSearchFilters(crossPlatform, { platform: "ps5" }), true);
  assert.equal(matchesSearchFilters(crossPlatform, { platform: "ps4" }), false);
  assert.equal(matchesSearchFilters(sarah, { query: "ppsa02929", emulator: "anyps5", status: "playable" }), true);
  assert.equal(matchesSearchFilters(sarah, { query: "missing", status: "playable" }), false);
});

test("the published index yields only Dreaming Sarah for AnyPS5 playable", () => {
  const catalog = readCatalogFile();
  assert.ok(catalog);
  const entries = toSearchIndex(catalog);
  const matched = entries.filter((item) =>
    matchesSearchFilters(item, { emulator: "anyps5", status: "playable" }),
  );
  assert.deepEqual(
    matched.map((item) => item.slug),
    ["dreaming-sarah"],
  );

  for (const platform of PLATFORMS) {
    for (const status of STATUSES) {
      for (const item of entries) {
        if (!matchesSearchFilters(item, { platform, status })) continue;
        assert.equal(
          item.reports.some(
            (report) => emulatorPlatform(report.emulator) === platform && report.status === status,
          ),
          true,
          `${item.slug} ${platform} ${status}`,
        );
      }
    }
  }

  for (const emulator of EMULATOR_IDS) {
    for (const status of STATUSES) {
      for (const item of entries) {
        if (!matchesSearchFilters(item, { emulator, status })) continue;
        assert.equal(
          item.reports.some((report) => report.emulator === emulator && report.status === status),
          true,
          `${item.slug} ${emulator} ${status}`,
        );
      }
    }
  }
});
