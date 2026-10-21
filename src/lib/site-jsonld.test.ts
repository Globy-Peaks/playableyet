import assert from "node:assert/strict";
import test from "node:test";
import { serializeJsonLd } from "./game-jsonld";
import type { FeedItem } from "./feeds";
import { homeJsonLd, newlyPlayableItemListJsonLd, websiteJsonLd } from "./site-jsonld";

const item: FeedItem = {
  slug: "dreaming-sarah",
  name: "Dreaming Sarah",
  emulator: "anyps5",
  editions: [{ id: "PPSA02929" }],
  at: "2026-10-14",
  status: "playable",
};

test("home page describes the website and its search url", () => {
  const website = websiteJsonLd("https://playableyet.vercel.app", "Public compatibility index.");
  assert.equal(website["@type"], "WebSite");
  assert.equal(website.url, "https://playableyet.vercel.app");
  assert.equal(website.potentialAction.target.urlTemplate, "https://playableyet.vercel.app/?q={search_term_string}");
});

test("the newly playable list only includes the supplied rows", () => {
  const list = newlyPlayableItemListJsonLd([item], "https://playableyet.vercel.app");
  assert.equal(list.numberOfItems, 1);
  assert.equal(list.itemListElement[0]?.name, "Dreaming Sarah");
  assert.equal(list.itemListElement[0]?.url, "https://playableyet.vercel.app/games/dreaming-sarah");
  assert.equal(list.itemListElement[0]?.position, 1);
});

test("an empty newly playable feed omits the item list", () => {
  const json = homeJsonLd("https://playableyet.vercel.app", "Public compatibility index.", []);
  assert.equal(json["@graph"].length, 1);
  assert.equal(json["@graph"][0]?.["@type"], "WebSite");
});

test("home structured data escapes markup in names", () => {
  const json = homeJsonLd("https://playableyet.vercel.app", "Index", [{ ...item, name: "Dreaming Sarah</script>" }]);
  const html = serializeJsonLd(json);
  assert.equal(html.includes("<"), false);
  assert.match(html, /\\u003c\/script>/);
});
