import assert from "node:assert/strict";
import test from "node:test";
import { readCatalogFile } from "./catalog-store";
import { withCanonicalSlugs } from "./slugs";
import { emulatorPlatform } from "./emulators";
import { matchesSearchFilters, normalizeSearchText } from "./search-filters";
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

test("search text ignores punctuation, apostrophes, accents, and spacing", () => {
  assert.equal(normalizeSearchText("Yakuza: Dead Souls"), "yakuza dead souls");
  assert.equal(normalizeSearchText("  yakuza   dead\tsouls "), "yakuza dead souls");
  assert.equal(normalizeSearchText("Demon's Souls"), "demons souls");
  assert.equal(normalizeSearchText("Demon’s Souls"), "demons souls");
  assert.equal(normalizeSearchText("Ghost of Yōtei"), "ghost of yotei");
  assert.equal(normalizeSearchText("Blitz: The League II"), "blitz the league 2");
  assert.equal(normalizeSearchText("BLUS30001"), "blus30001");
});

test("multi-word queries match titles with punctuation between the words", () => {
  const yakuza = entry({
    slug: "yakuza-dead-souls",
    name: "Yakuza: Dead Souls",
    ids: ["BLUS30826"],
    platforms: ["ps3"],
    reports: [{ emulator: "rpcs3", status: "playable" }],
  });
  const blitz = entry({
    slug: "blitz-the-league-ii",
    name: "Blitz: The League II",
    ids: ["BLUS30203"],
    platforms: ["ps3"],
    reports: [{ emulator: "rpcs3", status: "playable" }],
  });
  const demons = entry({
    slug: "demons-souls",
    name: "Demon's Souls",
    ids: ["BLUS30443"],
    platforms: ["ps3"],
    reports: [{ emulator: "rpcs3", status: "playable" }],
  });
  const yotei = entry({
    slug: "ghost-of-yotei",
    name: "Ghost of Yōtei",
    ids: ["PPSA26344"],
    platforms: ["ps5"],
    reports: [{ emulator: "anyps5", status: "ingame" }],
  });
  const serial = entry({
    slug: "serial-game",
    name: "Serial Game",
    ids: ["BLUS30001"],
    platforms: ["ps3"],
    reports: [{ emulator: "rpcs3", status: "ingame" }],
  });

  assert.equal(matchesSearchFilters(yakuza, { query: "yakuza dead souls" }), true);
  assert.equal(matchesSearchFilters(yakuza, { query: "yakuza: dead souls" }), true);
  assert.equal(matchesSearchFilters(blitz, { query: "blitz the league ii" }), true);
  assert.equal(matchesSearchFilters(blitz, { query: "blitz the league 2" }), true);
  assert.equal(matchesSearchFilters(demons, { query: "demons souls" }), true);
  assert.equal(matchesSearchFilters(demons, { query: "demon's souls" }), true);
  assert.equal(matchesSearchFilters(yotei, { query: "ghost of yotei" }), true);
  assert.equal(matchesSearchFilters(serial, { query: "BLUS30001" }), true);
  assert.equal(matchesSearchFilters(yakuza, { query: "BLUS30001" }), false);
  assert.equal(matchesSearchFilters(serial, { query: "blus30001" }), true);
});

test("yotei matches Ghost of Yōtei", () => {
  const catalog = readCatalogFile();
  assert.ok(catalog);
  const entries = toSearchIndex(catalog);
  const matched = entries.filter((item) => matchesSearchFilters(item, { query: "yotei" }));
  assert.deepEqual(
    matched.map((item) => item.slug),
    ["ghost-of-y-tei"],
  );
  assert.equal(
    matchesSearchFilters(matched[0], { query: "Yōtei" }),
    true,
  );
});

test("snapshot titles match the multi-word queries that punctuation used to hide", () => {
  const catalog = readCatalogFile();
  assert.ok(catalog);
  const entries = toSearchIndex(withCanonicalSlugs(catalog));
  const slugs = (query: string) =>
    entries.filter((item) => matchesSearchFilters(item, { query })).map((item) => item.slug);
  assert.ok(slugs("yakuza dead souls").includes("yakuza-dead-souls"));
  assert.ok(slugs("blitz the league ii").includes("blitz-the-league-ii"));
  assert.ok(slugs("blitz the league 2").includes("blitz-the-league-ii"));
  assert.ok(slugs("demons souls").includes("demons-souls"));
  assert.ok(slugs("demon's souls").includes("demons-souls"));
  assert.ok(slugs("ghost of yotei").includes("ghost-of-yotei"));
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
