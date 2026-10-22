import assert from "node:assert/strict";
import test from "node:test";
import { llmsText } from "./llms-text";
import type { Catalog } from "./types";

const catalog: Catalog = {
  generatedAt: "2026-10-21T06:43:00.000Z",
  games: [
    {
      slug: "split",
      name: "Split",
      titles: [],
      history: [],
      reports: [
        {
          emulator: "rpcs3",
          titleId: "BLUS00001",
          status: "playable",
          updatedAt: "2026-10-21",
          sourceUrl: "https://rpcs3.net/compatibility",
        },
        {
          emulator: "rpcs3",
          titleId: "NPUB00001",
          status: "ingame",
          updatedAt: "2026-10-21",
          sourceUrl: "https://rpcs3.net/compatibility",
        },
      ],
    },
  ],
};

test("llms.txt mirrors the snapshot FAQ and keeps the two units apart", () => {
  const text = llmsText("https://playableyet.vercel.app", catalog);
  assert.match(text, /does not host games or link to ROMs/);
  assert.match(text, /\/emulators\/rpcs3\/playable\/2/);
  assert.match(text, /How many PS3 games are playable on RPCS3\?/);
  assert.match(text, /1 of 1 game is Playable on RPCS3 in this snapshot \(100%\)/);
  assert.match(text, /1 of 2 RPCS3 title ID reports is Playable/);
  assert.match(text, /2026-10-21T06:43:00\.000Z/);
  assert.equal(text.includes("2855"), false);
  assert.equal(text.includes("80.02"), false);
  assert.match(text, /https:\/\/playableyet\.vercel\.app\/emulators\/rpcs3/);
});
