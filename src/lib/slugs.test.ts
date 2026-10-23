import assert from "node:assert/strict";
import test from "node:test";
import { readCatalogFile } from "./catalog-store";
import { emulatorCoverage, gamesOnPlatform } from "./hubs";
import { assignSlugs, findGameBySlug, slugForGroupedName, withCanonicalSlugs } from "./slugs";
import { mergePunctuationVariants } from "./title-groups";
import { PLATFORMS } from "./types";

test("diacritics and apostrophes get a canonical slug and keep the old one", () => {
  const [yotei, demons, demo] = assignSlugs([
    { name: "Ghost of Yōtei", titleIds: ["PPSA26344"], storedSlug: "ghost-of-y-tei" },
    { name: "Demon's Souls", titleIds: ["BLUS30443", "PPSA01341"], storedSlug: "demon-s-souls" },
    { name: "Demon's Souls Trade Demo", titleIds: ["BLUD80018"], storedSlug: "demon-s-souls-trade-demo" },
  ]);
  assert.equal(yotei?.slug, "ghost-of-yotei");
  assert.deepEqual(yotei?.aliases, ["ghost-of-y-tei"]);
  assert.equal(demons?.slug, "demons-souls");
  assert.deepEqual(demons?.aliases, ["demon-s-souls"]);
  assert.equal(demo?.slug, "demons-souls-trade-demo");
  assert.deepEqual(demo?.aliases, ["demon-s-souls-trade-demo"]);
});

test("slug collisions keep the game that already owns the canonical slug", () => {
  const assigned = assignSlugs([
    { name: "Demon's Souls", titleIds: ["BLUS30443"], storedSlug: "demon-s-souls" },
    { name: "Demons Souls", titleIds: ["CUSA00001"], storedSlug: "demons-souls" },
  ]);
  assert.equal(assigned[1]?.slug, "demons-souls");
  assert.equal(assigned[0]?.slug, "demons-souls-blus30443");
  assert.deepEqual(assigned[0]?.aliases, ["demon-s-souls"]);
  assert.deepEqual(assigned[1]?.aliases, []);
});

test("a historical slug that is not the old punctuation form stays put", () => {
  const [train] = assignSlugs([
    { name: "A-Train Express", titleIds: ["CUSA00010"], storedSlug: "a-exp" },
  ]);
  assert.equal(train?.slug, "a-exp");
  assert.deepEqual(train?.aliases, []);
});

test("two new games that want the same slug sort by name then title id", () => {
  const assigned = assignSlugs([
    { name: "Same Name", titleIds: ["CUSA00002"] },
    { name: "Same Name", titleIds: ["CUSA00001"] },
  ]);
  assert.equal(assigned[1]?.slug, "same-name");
  assert.equal(assigned[0]?.slug, "same-name-cusa00002");
});

test("a hand-kept slug is not treated as an apostrophe leftover", () => {
  assert.equal(slugForGroupedName("A-Train Express", "a-exp", ["A-Train Express"]), "a-exp");
  assert.equal(
    slugForGroupedName("Marvels Wolverine", "marvel-s-wolverine", ["Marvels Wolverine", "Marvel's Wolverine"]),
    "marvels-wolverine",
  );
});

test("the snapshot publishes Ghost of Yōtei and Demon's Souls at the folded slugs", () => {
  const file = readCatalogFile();
  assert.ok(file);
  const catalog = withCanonicalSlugs(file);
  const yotei = findGameBySlug(catalog.games, "ghost-of-y-tei");
  const demons = findGameBySlug(catalog.games, "demon-s-souls");
  assert.equal(yotei?.slug, "ghost-of-yotei");
  assert.equal(yotei?.name, "Ghost of Yōtei");
  assert.equal(demons?.slug, "demons-souls");
  assert.equal(demons?.name, "Demon's Souls");
  assert.equal(findGameBySlug(catalog.games, "ghost-of-yotei")?.slug, "ghost-of-yotei");
  assert.equal(findGameBySlug(catalog.games, "a-exp")?.slug, "a-exp");
  assert.equal(findGameBySlug(catalog.games, "missing-slug"), null);

  const slugs = new Set(catalog.games.map((game) => game.slug));
  assert.equal(slugs.size, catalog.games.length);
  for (const game of catalog.games) {
    for (const alias of game.aliases ?? []) assert.equal(slugs.has(alias), false);
  }
});

test("punctuation variants in the snapshot become one canonical page", () => {
  const file = readCatalogFile();
  assert.ok(file);
  const before = withCanonicalSlugs(file);
  const catalog = withCanonicalSlugs(mergePunctuationVariants(file));
  const wolverine = catalog.games.filter((game) => game.slug === "marvels-wolverine" || game.aliases?.includes("marvel-s-wolverine"));
  assert.equal(wolverine.length, 1);
  assert.equal(wolverine[0]?.slug, "marvels-wolverine");
  assert.equal(wolverine[0]?.name, "Marvel's Wolverine");
  assert.deepEqual(
    wolverine[0]?.titles.map((title) => title.id).sort(),
    ["PPSA03617", "PPSA03671"],
  );
  assert.equal(findGameBySlug(catalog.games, "marvel-s-wolverine")?.slug, "marvels-wolverine");
  assert.equal(findGameBySlug(catalog.games, "marvels-wolverine-ppsa03671")?.slug, "marvels-wolverine");
  assert.equal(catalog.games.some((game) => game.slug === "marvel-s-wolverine"), false);
  const journey = findGameBySlug(catalog.games, "journey-collector-s-edition");
  assert.equal(journey?.slug, "journey-collectors-edition");
  assert.ok(journey?.titles.some((title) => title.id === "CUSA02172"));
  assert.ok(journey?.titles.some((title) => title.id === "BCES01740"));

  const beforeSlugs = new Set(before.games.map((game) => game.slug));
  const afterSlugs = new Set(catalog.games.map((game) => game.slug));
  const removed = [...beforeSlugs].filter((slug) => !afterSlugs.has(slug)).sort();
  const added = [...afterSlugs].filter((slug) => !beforeSlugs.has(slug)).sort();
  assert.deepEqual(added, []);
  assert.ok(removed.includes("marvels-wolverine-ppsa03671"));
  assert.equal(removed.some((slug) => slug !== "marvels-wolverine-ppsa03671" && !slug.startsWith("journey-collectors-edition-")), false);

  for (const emulator of ["rpcs3", "shadps4", "fpps4", "sharpemu", "anyps5"] as const) {
    const earlier = emulatorCoverage(before).find((item) => item.emulator === emulator);
    const later = emulatorCoverage(catalog).find((item) => item.emulator === emulator);
    assert.deepEqual(later, earlier);
  }
  const kytyBefore = emulatorCoverage(before).find((item) => item.emulator === "kytyps5");
  const kytyAfter = emulatorCoverage(catalog).find((item) => item.emulator === "kytyps5");
  assert.equal(kytyAfter?.games, (kytyBefore?.games ?? 0) - 1);
  assert.equal(kytyAfter?.titleIds, kytyBefore?.titleIds);
  assert.equal(kytyAfter?.playableGames, kytyBefore?.playableGames);
  assert.equal(kytyAfter?.playableTitleIds, kytyBefore?.playableTitleIds);
  for (const platform of PLATFORMS) {
    const earlier = gamesOnPlatform(before, platform).length;
    const later = gamesOnPlatform(catalog, platform).length;
    assert.equal(later, platform === "ps5" ? earlier - 1 : earlier, platform);
  }
});
