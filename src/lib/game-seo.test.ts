import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { gameSeoDescription, gameSeoTitle } from "./game-seo";
import { statusPhrase } from "./status-copy";
import type { Catalog, Game } from "./types";

function game(partial: Partial<Game> & Pick<Game, "reports">): Game {
  return {
    slug: partial.slug ?? "sample",
    name: partial.name ?? "Sample",
    titles: partial.titles ?? [],
    reports: partial.reports,
    history: partial.history ?? [],
  };
}

test("titles ask whether the game is playable yet", () => {
  assert.equal(gameSeoTitle("Dreaming Sarah"), "Is Dreaming Sarah playable yet?");
});

test("description lists only projects that have a report", () => {
  const description = gameSeoDescription(
    game({
      name: "Ape Escape",
      reports: [
        {
          emulator: "rpcs3",
          titleId: "NPUA80473",
          status: "playable",
          updatedAt: "2026-10-14",
          sourceUrl: "https://rpcs3.net/compatibility",
        },
        {
          emulator: "anyps5",
          titleId: "PPSA00001",
          status: "in-bring-up",
          updatedAt: "2026-10-14",
          sourceUrl: "https://github.com/boykopovar/AnyPS5",
        },
        {
          emulator: "kytyps5",
          titleId: "PPSA00001",
          status: "nothing",
          updatedAt: "2026-10-14",
          sourceUrl: "https://kytyps5.github.io/",
        },
      ],
    }),
  );
  assert.equal(
    description,
    `Is Ape Escape playable yet? PlayStation 3: RPCS3 ${statusPhrase("rpcs3", "playable")}. PlayStation 5: KytyPS5 ${statusPhrase("kytyps5", "nothing")}, AnyPS5 ${statusPhrase("anyps5", "in-bring-up")}.`,
  );
  assert.match(description, /Nothing \(does not show its first logo or startup screen\)/);
  assert.equal(description.includes("shadPS4"), false);
  assert.equal(description.includes("fpPS4"), false);
  assert.equal(description.includes("SharpEmu"), false);
});

test("distinct statuses on one project are both named", () => {
  const description = gameSeoDescription(
    game({
      name: "Regional",
      reports: [
        {
          emulator: "rpcs3",
          titleId: "BLUS00001",
          status: "nothing",
          updatedAt: "2026-10-14",
          sourceUrl: "https://rpcs3.net/compatibility",
        },
        {
          emulator: "rpcs3",
          titleId: "BLES00001",
          status: "playable",
          updatedAt: "2026-10-14",
          sourceUrl: "https://rpcs3.net/compatibility",
        },
      ],
    }),
  );
  assert.equal(
    description,
    `Is Regional playable yet? PlayStation 3: RPCS3 ${statusPhrase("rpcs3", "playable")} and ${statusPhrase("rpcs3", "nothing")}.`,
  );
});

test("a game with no reports does not gain a status", () => {
  const description = gameSeoDescription(game({ name: "Unlisted", reports: [] }));
  assert.equal(description, "Is Unlisted playable yet? No public compatibility report in this snapshot.");
});

test("the published Dreaming Sarah page uses its snapshot reports", () => {
  const catalog = JSON.parse(readFileSync("data/catalog.json", "utf8")) as Catalog;
  const sarah = catalog.games.find((entry) => entry.slug === "dreaming-sarah");
  assert.ok(sarah);
  const description = gameSeoDescription(sarah);
  assert.match(description, /^Is Dreaming Sarah playable yet\? PlayStation 5: /);
  assert.match(description, /AnyPS5 Playable/);
  assert.equal(description.includes("RPCS3"), false);
  assert.equal(description.includes("shadPS4"), false);
  assert.equal(description.includes("fpPS4"), false);
});
