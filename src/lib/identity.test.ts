import assert from "node:assert/strict";
import test from "node:test";
import { normalizeName, slugifyName, splitTitleAndId, UnionFind } from "./identity";

test("normalizes titles for grouping", () => {
  assert.equal(normalizeName("RESOGUN™ (USA)"), "resogun");
  assert.equal(slugifyName("The Last of Us™"), "the-last-of-us");
  assert.equal(slugifyName("Ghost of Yōtei"), "ghost-of-yotei");
  assert.equal(slugifyName("Demon's Souls"), "demons-souls");
  assert.equal(slugifyName("Pokémon"), "pokemon");
  assert.equal(slugifyName("Æon Flux"), "aeon-flux");
  assert.notEqual(normalizeName("The Last of Us"), normalizeName("The Last of Us Remastered"));
});

test("splits issue titles", () => {
  assert.deepEqual(splitTitleAndId("CUSA00038 - RESOGUN™"), {
    titleId: "CUSA00038",
    name: "RESOGUN",
  });
  assert.deepEqual(splitTitleAndId("Tina's Toy Factory - CUSA01658"), {
    titleId: "CUSA01658",
    name: "Tina's Toy Factory",
  });
});

test("union find groups regional ids", () => {
  const groups = new UnionFind();
  groups.union("CUSA00005", "CUSA00038");
  groups.union("CUSA00038", "CUSA00999");
  assert.equal(groups.find("CUSA00005"), groups.find("CUSA00999"));
});
