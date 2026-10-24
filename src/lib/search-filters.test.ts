import assert from "node:assert/strict";
import test from "node:test";
import { readCatalogFile } from "./catalog-store";
import { withCanonicalSlugs } from "./slugs";
import { emulatorPlatform } from "./emulators";
import { closestSearchEntries, filterSearchEntries, readHomeSearch } from "./home-search";
import { alternateNamesForTitle, matchesSearchFilters, normalizeSearchText } from "./search-filters";
import { publishCatalog } from "./title-groups";
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
  assert.equal(matchesSearchFilters(yakuza, { query: "souls yakuza" }), true);
  assert.equal(matchesSearchFilters(yakuza, { query: "yakuza destruction" }), false);
});

test("abbreviations match the series and letters do not cross words", () => {
  const mahjong = entry({
    slug: "mahjong-taikai-iv",
    name: "Mahjong Taikai IV",
    platforms: ["ps3"],
    reports: [{ emulator: "rpcs3", status: "playable" }],
  });
  const tactics = entry({
    slug: "metal-slug-tactics",
    name: "Metal Slug Tactics",
    platforms: ["ps4"],
    reports: [{ emulator: "shadps4", status: "ingame" }],
  });
  const dog = entry({
    slug: "dog-the-dog",
    name: "DOG THE DOG TAKES THE HINDMOST.",
    platforms: ["ps4"],
    reports: [{ emulator: "shadps4", status: "nothing" }],
  });
  const gta = entry({
    slug: "grand-theft-auto-v",
    name: "Grand Theft Auto V",
    platforms: ["ps4"],
    reports: [{ emulator: "shadps4", status: "ingame" }],
  });
  const vice = entry({
    slug: "grand-theft-auto-vice-city",
    name: "Grand Theft Auto: Vice City",
    platforms: ["ps4"],
    reports: [{ emulator: "shadps4", status: "menus" }],
  });
  const tlou = entry({
    slug: "the-last-of-us",
    name: "The Last of Us",
    platforms: ["ps3"],
    reports: [{ emulator: "rpcs3", status: "ingame" }],
  });
  const destiny = entry({
    slug: "destiny",
    name: "Destiny",
    platforms: ["ps4"],
    reports: [{ emulator: "shadps4", status: "ingame" }],
  });
  assert.equal(matchesSearchFilters(mahjong, { query: "gta" }), false);
  assert.equal(matchesSearchFilters(tactics, { query: "gta" }), false);
  assert.equal(matchesSearchFilters(dog, { query: "gta" }), false);
  assert.equal(matchesSearchFilters(gta, { query: "gta" }), true);
  assert.equal(matchesSearchFilters(gta, { query: "gta v" }), true);
  assert.equal(matchesSearchFilters(gta, { query: "GTA V" }), true);
  assert.equal(matchesSearchFilters(vice, { query: "gta" }), true);
  assert.equal(matchesSearchFilters(vice, { query: "gta v" }), false);
  assert.equal(matchesSearchFilters(gta, { query: "grand theft auto v" }), true);
  assert.equal(matchesSearchFilters(tlou, { query: "tlou" }), true);
  assert.equal(matchesSearchFilters(tlou, { query: "TLOU" }), true);
  assert.equal(matchesSearchFilters(destiny, { query: "des" }), false);
  assert.equal(matchesSearchFilters(destiny, { query: "destiny" }), true);
  assert.deepEqual(alternateNamesForTitle("Grand Theft Auto V"), ["GTA V"]);
  assert.deepEqual(alternateNamesForTitle("The Last of Us Part II"), ["TLOU Part II"]);
  assert.deepEqual(alternateNamesForTitle("God of War III"), ["GoW III"]);
  assert.deepEqual(alternateNamesForTitle("Gran Turismo 7"), ["GT7"]);
  assert.deepEqual(alternateNamesForTitle("Demon's Souls"), ["DeS"]);
  assert.deepEqual(alternateNamesForTitle("METAL GEAR SOLID V: THE PHANTOM PAIN"), ["MGS V THE PHANTOM PAIN"]);
  assert.deepEqual(alternateNamesForTitle("Red Dead Redemption 2"), ["RDR 2"]);
  assert.deepEqual(alternateNamesForTitle("FINAL FANTASY VII"), ["FF VII"]);
  assert.deepEqual(alternateNamesForTitle("World of Final Fantasy"), []);
});

test("words match in any order and a phrase stays ahead of a scattered title", () => {
  const tools = entry({
    slug: "tools",
    name: "Ratchet & Clank: Tools of Destruction",
    ids: ["BCES00052"],
    platforms: ["ps3"],
    reports: [{ emulator: "rpcs3", status: "ingame" }],
  });
  const scattered = entry({
    slug: "scattered",
    name: "Destruction of Gallery Tools",
    platforms: ["ps3"],
    reports: [{ emulator: "rpcs3", status: "ingame" }],
  });
  const phrase = entry({
    slug: "phrase",
    name: "Alpha Tools of Destruction",
    platforms: ["ps3"],
    reports: [{ emulator: "rpcs3", status: "ingame" }],
  });
  assert.equal(matchesSearchFilters(tools, { query: "ratchet tools of destruction" }), true);
  assert.equal(matchesSearchFilters(tools, { query: "ratchet clank tools" }), true);
  assert.equal(matchesSearchFilters(tools, { query: "ratchet tools of oblivion" }), false);
  assert.equal(matchesSearchFilters(tools, { query: "clanktools" }), false);
  const ranked = filterSearchEntries([scattered, phrase, tools], readHomeSearch({ q: "tools of destruction" }));
  assert.deepEqual(
    ranked.map((item) => item.slug),
    ["phrase", "tools", "scattered"],
  );
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
  assert.deepEqual(slugs("gta v"), ["grand-theft-auto-v"]);
  assert.ok(slugs("gta").includes("grand-theft-auto-v"));
  assert.equal(slugs("gta").includes("mahjong-taikai-iv"), false);
  assert.equal(slugs("gta").some((slug) => slug.includes("metal-slug")), false);
  assert.equal(slugs("gta").includes("dog-the-dog-takes-the-hindmost"), false);
  assert.ok(slugs("tlou").includes("the-last-of-us"));
  assert.ok(slugs("rdr").includes("red-dead-redemption"));
  assert.ok(slugs("gow").includes("god-of-war"));
  assert.ok(slugs("gt7").includes("gran-turismo-7"));
  assert.ok(slugs("des").includes("demons-souls") || slugs("des").includes("demon-s-souls"));
  assert.ok(slugs("mgs").includes("metal-gear-solid-v-the-phantom-pain"));
  assert.ok(slugs("ff").includes("final-fantasy-vii"));
  assert.equal(slugs("des").includes("destiny"), false);
});

test("a skipped word still finds Ratchet & Clank: Tools of Destruction on one page", () => {
  const file = readCatalogFile();
  assert.ok(file);
  const entries = toSearchIndex(publishCatalog(file));
  const slugs = (query: string) =>
    filterSearchEntries(entries, readHomeSearch({ q: query })).map((item) => item.slug);
  const tools = [
    "ratchet-clank-tools-of-destruction",
    "ratchet-clank-tools-of-destruction-demo",
  ];
  assert.deepEqual(slugs("ratchet tools of destruction"), tools);
  assert.deepEqual(slugs("tools of destruction"), tools);
  assert.deepEqual(slugs("ratchet clank tools"), tools);
  assert.equal(slugs("ratchet tools of destruction").includes("ratchet-clank-future-tools-of-destruction"), false);
  assert.deepEqual(slugs("gta v"), ["grand-theft-auto-v"]);
  assert.deepEqual(slugs("v gta"), ["grand-theft-auto-v"]);
  assert.ok(slugs("gta").includes("grand-theft-auto-v"));
  assert.ok(slugs("gta").includes("grand-theft-auto-vice-city"));
  assert.equal(slugs("gta v").includes("grand-theft-auto-vice-city"), false);
  assert.equal(slugs("gta").includes("mahjong-taikai-iv"), false);
  assert.ok(slugs("yakuza dead souls").includes("yakuza-dead-souls"));
  assert.ok(slugs("yotei").includes("ghost-of-yotei"));
  assert.ok(slugs("ghost of yotei").includes("ghost-of-yotei"));
  const closest = closestSearchEntries(entries, readHomeSearch({ q: "ratchet tools of oblivion" }));
  assert.deepEqual(
    closest.map((item) => item.slug),
    tools,
  );
  assert.equal(closestSearchEntries(entries, readHomeSearch({ q: "zzzzqqqq" })).length, 0);
  assert.equal(
    closestSearchEntries(entries, readHomeSearch({ q: "ratchet tools of oblivion", platform: "ps5" })).length,
    0,
  );
});

test("every snapshot game still matches its own name and title ids", () => {
  const catalog = readCatalogFile();
  assert.ok(catalog);
  const entries = toSearchIndex(catalog);
  for (const item of entries) {
    assert.equal(matchesSearchFilters(item, { query: item.name }), true, item.name);
    for (const id of item.ids) {
      assert.equal(matchesSearchFilters(item, { query: id }), true, `${item.slug} ${id}`);
    }
  }
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
