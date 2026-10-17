import assert from "node:assert/strict";
import test from "node:test";
import { nameStem, primaryPlatform, relatedGames } from "./related";
import type { Game } from "./types";

function game(partial: Partial<Game> & Pick<Game, "slug" | "name">): Game {
  return {
    slug: partial.slug,
    name: partial.name,
    titles: partial.titles ?? [{ id: "BLUS00001", platform: "ps3", name: partial.name }],
    reports: partial.reports ?? [],
    history: [],
  };
}

test("name stems ignore a leading article and stay specific", () => {
  assert.equal(nameStem("The Last of Us"), "last us");
  assert.equal(nameStem("God of War III"), "god war");
  assert.equal(nameStem("OK"), "");
});

test("related games prefer the same name stem over a merely similar status", () => {
  const sarah = game({
    slug: "dreaming-sarah",
    name: "Dreaming Sarah",
    titles: [{ id: "PPSA02929", platform: "ps5" }],
    reports: [
      {
        emulator: "anyps5",
        titleId: "PPSA02929",
        status: "playable",
        updatedAt: "2026-10-14",
        sourceUrl: "https://github.com/boykopovar/AnyPS5",
      },
    ],
  });
  const demo = game({
    slug: "dreaming-sarah-demo",
    name: "Dreaming Sarah Demo",
    titles: [{ id: "PPSA02930", platform: "ps5" }],
    reports: [
      {
        emulator: "sharpemu",
        titleId: "PPSA02930",
        status: "ingame",
        updatedAt: "2026-10-14",
        sourceUrl: "https://sharpemu.app/compatibility/",
      },
    ],
  });
  const other = game({
    slug: "other-playable",
    name: "Other Playable",
    titles: [{ id: "PPSA00002", platform: "ps5" }],
    reports: [
      {
        emulator: "sharpemu",
        titleId: "PPSA00002",
        status: "playable",
        updatedAt: "2026-10-14",
        sourceUrl: "https://sharpemu.app/compatibility/",
      },
    ],
  });
  const related = relatedGames([sarah, demo, other], sarah, 6);
  assert.equal(related[0]?.slug, "dreaming-sarah-demo");
  assert.equal(related.some((item) => item.slug === "dreaming-sarah"), false);
  assert.equal(primaryPlatform(sarah), "ps5");
});
