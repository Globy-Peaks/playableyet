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
  const html = serializeJsonLd(json);
  assert.equal(html.includes("<"), false);
  assert.match(html, /\\u003c\/script>/);
});
