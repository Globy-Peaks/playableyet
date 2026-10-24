import assert from "node:assert/strict";
import test from "node:test";
import { readCatalogFile } from "./catalog-store";
import { statusChanges } from "./feeds";
import { groupKey } from "./identity";
import { emulatorCoverage, gamesOnPlatform } from "./hubs";
import { findGameBySlug, withCanonicalSlugs } from "./slugs";
import { TITLE_GROUP_ALIASES } from "./title-group-aliases";
import { mergePunctuationVariants, publishCatalog, regionalVariantCollisions, regionalVariantKey } from "./title-groups";
import { EMULATOR_IDS, PLATFORMS } from "./types";

test("regional alias keys do not overlap or fold different products together", () => {
  const seen = new Map<string, string>();
  for (const alias of TITLE_GROUP_ALIASES) {
    const canonical = groupKey(alias.name);
    assert.notEqual(regionalVariantKey(alias.name), "");
    for (const spelling of [alias.name, ...alias.variants]) {
      const key = groupKey(spelling);
      assert.equal(seen.get(key), undefined, key);
      seen.set(key, alias.name);
    }
    for (const variant of alias.variants) assert.notEqual(groupKey(variant), canonical);
  }
  assert.equal(seen.has(groupKey("Grand Theft Auto 3")), false);
  assert.equal(seen.has(groupKey("Grand Theft Auto III – The Definitive Edition")), false);
  assert.equal(seen.has(groupKey("Ratchet & Clank Future: A Crack in Time Clank Demo")), false);
  assert.equal(seen.has(groupKey("Ratchet Deadlocked")), false);
  assert.equal(seen.has(groupKey("Ratchet Gladiator")), false);
});

test("known regional titles become one canonical page and old slugs redirect", () => {
  const file = readCatalogFile();
  assert.ok(file);
  const before = withCanonicalSlugs(mergePunctuationVariants(file));
  const catalog = publishCatalog(file);
  assert.equal(catalog.games.length, before.games.length - 6);
  assert.deepEqual(regionalVariantCollisions(catalog.games), []);

  const tools = findGameBySlug(catalog.games, "ratchet-clank-future-tools-of-destruction");
  assert.equal(tools?.slug, "ratchet-clank-tools-of-destruction");
  assert.equal(tools?.name, "Ratchet & Clank: Tools of Destruction");
  assert.deepEqual(
    tools?.titles.map((title) => title.id),
    ["BCES00052", "BCJS30014", "BCUS98127", "NPEA00452", "NPUA80965"],
  );
  assert.ok(tools?.aliases?.includes("ratchet-clank-future-tools-of-destruction"));

  const demo = findGameBySlug(catalog.games, "ratchet-clank-future-tools-of-destruction-demo");
  assert.equal(demo?.slug, "ratchet-clank-tools-of-destruction-demo");
  assert.equal(demo?.name, "Ratchet & Clank: Tools of Destruction Demo");
  assert.deepEqual(
    demo?.titles.map((title) => title.id),
    ["BCUS98153", "NPEA90017", "NPHA20002", "NPJA90035", "NPUA98153"],
  );
  assert.equal(demo?.titles.some((title) => tools?.titles.some((full) => full.id === title.id)), false);

  const crack = findGameBySlug(catalog.games, "ratchet-clank-future-a-crack-in-time");
  assert.equal(crack?.slug, "ratchet-clank-a-crack-in-time");
  assert.equal(crack?.name, "Ratchet & Clank: A Crack In Time");
  assert.deepEqual(
    crack?.titles.map((title) => title.id),
    ["BCES00511", "BCES00726", "BCES00748", "BCUS98124", "NPEA00453", "NPUA80966"],
  );

  const ratchetDemo = findGameBySlug(catalog.games, "ratchet-clank-future-a-crack-in-time-ratchet-demo");
  assert.equal(ratchetDemo?.slug, "ratchet-clank-a-crack-in-time-ratchet-demo");
  assert.deepEqual(
    ratchetDemo?.titles.map((title) => title.id),
    ["NPEA90046", "NPHA80078", "NPJA90116", "NPUA70083"],
  );

  const clank = findGameBySlug(catalog.games, "ratchet-clank-future-a-crack-in-time-clank-demo");
  assert.equal(clank?.slug, "ratchet-clank-future-a-crack-in-time-clank-demo");
  assert.deepEqual(
    clank?.titles.map((title) => title.id),
    ["NPHA80079", "NPJA90118", "NPUA70085"],
  );
  const genericDemo = findGameBySlug(catalog.games, "ratchet-clank-a-crack-in-time-demo");
  assert.equal(genericDemo?.slug, "ratchet-clank-a-crack-in-time-demo");
  assert.deepEqual(genericDemo?.titles.map((title) => title.id), ["NPEA90051"]);

  const booty = findGameBySlug(catalog.games, "ratchet-clank-future-quest-for-booty");
  assert.equal(booty?.slug, "ratchet-clank-quest-for-booty");
  assert.equal(booty?.name, "Ratchet & Clank: Quest for Booty");
  assert.deepEqual(
    booty?.titles.map((title) => title.id),
    ["BCAS20052", "BCES00301", "NPEA00088", "NPUA80145"],
  );

  const ocean = findGameBySlug(catalog.games, "star-ocean-5-integrity-and-faithlessness");
  assert.equal(ocean?.slug, "star-ocean-integrity-and-faithlessness");
  assert.equal(ocean?.name, "STAR OCEAN: Integrity and Faithlessness");
  assert.deepEqual(
    ocean?.titles.map((title) => title.id),
    ["BLJM61325", "CUSA03219", "CUSA03246", "NPJB00727"],
  );
  assert.deepEqual(
    ocean?.titles.map((title) => title.platform).sort(),
    ["ps3", "ps3", "ps4", "ps4"],
  );

  const gta3 = findGameBySlug(catalog.games, "grand-theft-auto-3");
  const definitive = findGameBySlug(catalog.games, "grand-theft-auto-iii-the-definitive-edition");
  assert.deepEqual(gta3?.titles.map((title) => title.id), ["CUSA03550"]);
  assert.deepEqual(
    definitive?.titles.map((title) => title.id),
    ["CUSA26613", "PPSA03527"],
  );
  assert.notEqual(gta3?.slug, definitive?.slug);

  const slugs = new Set(catalog.games.map((game) => game.slug));
  const retired = [
    "ratchet-clank-future-tools-of-destruction",
    "ratchet-clank-future-tools-of-destruction-demo",
    "ratchet-clank-future-a-crack-in-time",
    "ratchet-clank-future-a-crack-in-time-ratchet-demo",
    "ratchet-clank-future-quest-for-booty",
    "star-ocean-5-integrity-and-faithlessness",
  ];
  for (const slug of retired) assert.equal(slugs.has(slug), false, slug);
  for (const game of catalog.games) {
    for (const alias of game.aliases ?? []) assert.equal(slugs.has(alias), false, alias);
  }

  const again = publishCatalog(catalog);
  assert.deepEqual(
    again.games.map((game) => game.slug),
    catalog.games.map((game) => game.slug),
  );
});

test("regional merges do not change other hub counts or status-change feeds", () => {
  const file = readCatalogFile();
  assert.ok(file);
  const before = withCanonicalSlugs(mergePunctuationVariants(file));
  const after = publishCatalog(file);
  for (const emulator of EMULATOR_IDS) {
    const earlier = emulatorCoverage(before).find((item) => item.emulator === emulator);
    const later = emulatorCoverage(after).find((item) => item.emulator === emulator);
    assert.ok(earlier && later);
    assert.equal(later.titleIds, earlier.titleIds, `${emulator} title ids`);
    assert.equal(later.playableTitleIds, earlier.playableTitleIds, `${emulator} playable title ids`);
    if (emulator === "rpcs3") {
      // Five PS3 pairs each drop one RPCS3 page. Star Ocean's PS4 page has no RPCS3 report.
      assert.equal(later.games, earlier.games - 5);
      assert.equal(later.playableGames, earlier.playableGames - 1);
      continue;
    }
    assert.equal(later.games, earlier.games, `${emulator} games`);
    assert.equal(later.playableGames, earlier.playableGames, `${emulator} playable games`);
  }
  for (const platform of PLATFORMS) {
    const delta = platform === "ps3" ? -5 : 0;
    assert.equal(
      gamesOnPlatform(after, platform).length,
      gamesOnPlatform(before, platform).length + delta,
      platform,
    );
  }

  const signature = (catalog: typeof after) =>
    statusChanges(catalog).map((item) =>
      [
        item.slug,
        item.name,
        item.at,
        item.emulator,
        item.from ?? "",
        item.status,
        item.editions.map((edition) => `${edition.id}:${edition.region ?? ""}`).join(","),
      ].join("|"),
    );
  assert.deepEqual(signature(after), signature(before));
});
