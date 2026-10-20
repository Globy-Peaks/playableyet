import assert from "node:assert/strict";
import test from "node:test";
import { readCatalogFile } from "./catalog-store";
import { assignSlugs, findGameBySlug, withCanonicalSlugs } from "./slugs";

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
