import assert from "node:assert/strict";
import test from "node:test";
import { closestSearchEntries, filterSearchEntries, homeSearchHref, isFilteredSearch, readHomeSearch, searchCountLabel, searchResultTitle } from "./home-search";
import type { SearchEntry } from "./types";

const tales: SearchEntry = {
  slug: "tales-of-berseria",
  name: "Tales of Berseria",
  ids: ["CUSA03875"],
  platforms: ["ps4"],
  best: "nothing",
  updatedAt: "2026-10-14",
  reports: [{ emulator: "shadps4", status: "nothing" }],
};

test("a q parameter is a filtered search and round-trips into the home URL", () => {
  const search = readHomeSearch({ q: "  tales   of berseria  " });
  assert.equal(search.q, "tales of berseria");
  assert.equal(isFilteredSearch(search), true);
  assert.equal(homeSearchHref(search), "/?q=tales+of+berseria");
  assert.equal(searchResultTitle(search), "Search results for tales of berseria");
  assert.deepEqual(
    filterSearchEntries([tales], search).map((entry) => entry.slug),
    ["tales-of-berseria"],
  );
  assert.equal(filterSearchEntries([tales], readHomeSearch({ q: "missing-title" })).length, 0);
});

test("a single match uses the singular game label", () => {
  assert.equal(searchCountLabel(1, 6069), `1 game of ${(6069).toLocaleString()}`);
  assert.equal(searchCountLabel(2, 6069), `2 games of ${(6069).toLocaleString()}`);
  assert.equal(searchCountLabel(0, 6069), `0 games of ${(6069).toLocaleString()}`);
  assert.equal(searchCountLabel(6069, 6069), `${(6069).toLocaleString()} games`);
});

test("closest matches are the titles that share the most words", () => {
  const tools: SearchEntry = {
    ...tales,
    slug: "tools",
    name: "Ratchet & Clank: Tools of Destruction",
    ids: ["BCES00052"],
    platforms: ["ps3"],
    reports: [{ emulator: "rpcs3", status: "ingame" }],
  };
  const museum: SearchEntry = { ...tools, slug: "museum", name: "Museum of Tools" };
  const gta: SearchEntry = { ...tools, slug: "gta", name: "Grand Theft Auto V", ids: ["CUSA00411"] };
  const vice: SearchEntry = { ...tools, slug: "vice", name: "Grand Theft Auto: Vice City" };
  const demons: SearchEntry = { ...tools, slug: "demons", name: "Demon's Souls" };
  const destiny: SearchEntry = { ...tools, slug: "destiny", name: "Destiny" };
  assert.deepEqual(
    closestSearchEntries([tools, museum], readHomeSearch({ q: "ratchet tools of oblivion" })).map((item) => item.slug),
    ["tools"],
  );
  assert.deepEqual(
    closestSearchEntries([vice, gta], readHomeSearch({ q: "gta v wrong" })).map((item) => item.slug),
    ["gta"],
  );
  assert.deepEqual(
    closestSearchEntries([destiny, demons], readHomeSearch({ q: "des wrong" })).map((item) => item.slug),
    ["demons"],
  );
  assert.equal(closestSearchEntries([tools], readHomeSearch({ q: "tools of destruction" })).length, 0);
  assert.equal(closestSearchEntries([tools], readHomeSearch({ q: "zzzz qqqq" })).length, 0);
  assert.equal(closestSearchEntries([tools], readHomeSearch({ platform: "ps5" })).length, 0);
});

test("the bare home URL is not a search results page", () => {
  const search = readHomeSearch({});
  assert.equal(isFilteredSearch(search), false);
  assert.equal(homeSearchHref(search), "/");
  assert.equal(searchResultTitle(search), null);
  assert.equal(searchResultTitle(readHomeSearch({ platform: "ps4" })), "Search results");
});
