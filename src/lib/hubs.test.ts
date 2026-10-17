import assert from "node:assert/strict";
import test from "node:test";
import {
  countByBestStatus,
  emulatorHeadline,
  gamesOnEmulator,
  gamesWithBestStatus,
  platformHeadline,
  reportsOnEmulator,
} from "./hubs";
import type { Catalog, Game } from "./types";

function game(partial: Partial<Game> & Pick<Game, "slug" | "name" | "reports">): Game {
  return {
    slug: partial.slug,
    name: partial.name,
    titles: partial.titles ?? [],
    reports: partial.reports,
    history: [],
  };
}

const catalog: Catalog = {
  generatedAt: "2026-10-17T06:15:00.000Z",
  games: [
    game({
      slug: "playable-one",
      name: "Playable One",
      titles: [{ id: "CUSA00001", platform: "ps4" }],
      reports: [
        {
          emulator: "shadps4",
          titleId: "CUSA00001",
          status: "playable",
          updatedAt: "2026-10-14",
          sourceUrl: "https://shadps4.net/compatibility/",
        },
        {
          emulator: "fpps4",
          titleId: "CUSA00001",
          status: "nothing",
          updatedAt: "2026-10-14",
          sourceUrl: "https://fpps4.net/compatibility/",
        },
      ],
    }),
    game({
      slug: "menus-one",
      name: "Menus One",
      titles: [{ id: "CUSA00002", platform: "ps4" }],
      reports: [
        {
          emulator: "shadps4",
          titleId: "CUSA00002",
          status: "menus",
          updatedAt: "2026-10-14",
          sourceUrl: "https://shadps4.net/compatibility/",
        },
      ],
    }),
  ],
};

test("emulator hubs count the best status and do not invent playable rows", () => {
  const games = gamesOnEmulator(catalog, "shadps4");
  const counts = countByBestStatus(games, (game) => reportsOnEmulator(game, "shadps4"));
  assert.equal(counts.find((item) => item.status === "playable")?.games, 1);
  assert.equal(counts.find((item) => item.status === "menus")?.games, 1);
  assert.equal(counts.find((item) => item.status === "boots")?.games, 0);
  assert.deepEqual(
    gamesWithBestStatus(games, (game) => reportsOnEmulator(game, "shadps4"), "playable").map((item) => item.slug),
    ["playable-one"],
  );
  assert.equal(
    platformHeadline("ps4", 2, 1),
    "1 PlayStation 4 game has a Playable report in this snapshot, out of 2 tracked PlayStation 4 games.",
  );
  assert.equal(
    emulatorHeadline("shadps4", 2, 1),
    "1 game has a Playable shadPS4 report in this snapshot, out of 2 games with a shadPS4 report.",
  );
});
