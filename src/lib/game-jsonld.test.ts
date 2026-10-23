import assert from "node:assert/strict";
import test from "node:test";
import { serializeJsonLd, videoGameJsonLd } from "./game-jsonld";
import type { Game } from "./types";

const game: Game = {
  slug: "dreaming-sarah",
  name: "Dreaming Sarah</script>",
  titles: [{ id: "PPSA02929", platform: "ps5", name: "Dreaming Sarah" }],
  reports: [
    {
      emulator: "anyps5",
      titleId: "PPSA02929",
      status: "playable",
      updatedAt: "2026-10-14",
      sourceUrl: "https://github.com/boykopovar/AnyPS5",
    },
  ],
  history: [],
};

test("game pages describe a VideoGame and its status id", () => {
  const json = videoGameJsonLd(game, "https://playableyet.vercel.app/games/dreaming-sarah", "Dreaming Sarah is playable.");
  assert.equal(json["@type"], "VideoGame");
  assert.equal(json.url, "https://playableyet.vercel.app/games/dreaming-sarah");
  assert.deepEqual(json.gamePlatform, ["PlayStation 5"]);
  assert.equal(json.additionalProperty[0]?.value, "playable");
  assert.equal(json.additionalProperty[0]?.propertyID, "anyps5");
  assert.match(String(json.additionalProperty[0]?.description), /Playable \(officially confirmed/);
  const html = serializeJsonLd(json);
  assert.equal(html.includes("<"), false);
  assert.match(html, /\\u003c\/script>/);
  assert.equal("alternateName" in json, false);
});

test("series abbreviations are alternate names", () => {
  const gta = videoGameJsonLd(
    { ...game, slug: "grand-theft-auto-v", name: "Grand Theft Auto V" },
    "https://playableyet.vercel.app/games/grand-theft-auto-v",
    "Grand Theft Auto V.",
  );
  assert.equal(alternateNameOf(gta), "GTA V");
  const tlou = videoGameJsonLd(
    { ...game, slug: "the-last-of-us", name: "The Last of Us" },
    "https://playableyet.vercel.app/games/the-last-of-us",
    "The Last of Us.",
  );
  assert.equal(alternateNameOf(tlou), "TLOU");
  const demons = videoGameJsonLd(
    { ...game, slug: "demons-souls", name: "Demon's Souls" },
    "https://playableyet.vercel.app/games/demons-souls",
    "Demon's Souls.",
  );
  assert.equal(alternateNameOf(demons), "DeS");
});

function alternateNameOf(value: object): unknown {
  return "alternateName" in value ? value.alternateName : undefined;
}
