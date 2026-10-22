import assert from "node:assert/strict";
import test from "node:test";
import {
  countByBestStatus,
  coverageFromGames,
  emulatorCoverage,
  emulatorHeadline,
  emulatorListingPaths,
  emulatorStatusPagePath,
  formatPlayablePercent,
  gamesOnEmulator,
  gamesWithBestStatus,
  hubPageCount,
  hubPageSlice,
  parseHubPage,
  platformHeadline,
  reportsOnEmulator,
  titleIdSentence,
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
    "1 of 2 games is Playable on shadPS4 in this snapshot (50%).",
  );
  const coverage = coverageFromGames("shadps4", games);
  assert.equal(coverage.games, 2);
  assert.equal(coverage.playableGames, 1);
  assert.equal(coverage.titleIds, 2);
  assert.equal(coverage.playableTitleIds, 1);
  assert.equal(emulatorCoverage(catalog).find((item) => item.emulator === "fpps4")?.titleIds, 1);
});

test("title ID counts stay separate from grouped games", () => {
  const mixed: Catalog = {
    generatedAt: "2026-10-21T00:00:00.000Z",
    games: [
      game({
        slug: "split",
        name: "Split",
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
      }),
      game({
        slug: "nothing-one",
        name: "Nothing One",
        reports: [
          {
            emulator: "rpcs3",
            titleId: "BLUS00002",
            status: "nothing",
            updatedAt: "2026-10-21",
            sourceUrl: "https://rpcs3.net/compatibility",
          },
        ],
      }),
    ],
  };
  const coverage = coverageFromGames("rpcs3", mixed.games);
  assert.deepEqual(
    { games: coverage.games, playableGames: coverage.playableGames, titleIds: coverage.titleIds, playableTitleIds: coverage.playableTitleIds },
    { games: 2, playableGames: 1, titleIds: 3, playableTitleIds: 1 },
  );
  assert.equal(formatPlayablePercent(coverage.playableGames, coverage.games), "50%");
  assert.match(titleIdSentence(coverage), /1 of 3 RPCS3 title ID reports is Playable/);
  assert.equal(formatPlayablePercent(2759, 3463), "79.7%");
  assert.equal(formatPlayablePercent(0, 4), "0%");
  assert.equal(formatPlayablePercent(1, 0), null);
});

test("status lists keep page 1 and link every later page", () => {
  const games = Array.from({ length: 41 }, (_, index) =>
    game({
      slug: `game-${index}`,
      name: `Game ${index}`,
      reports: [
        {
          emulator: "shadps4",
          titleId: `CUSA${String(index).padStart(5, "0")}`,
          status: "playable",
          updatedAt: "2026-10-14",
          sourceUrl: "https://shadps4.net/compatibility/",
        },
      ],
    }),
  );
  const paths = emulatorListingPaths({ generatedAt: "2026-10-17T00:00:00.000Z", games });
  assert.equal(paths.includes("/emulators/shadps4/playable/2"), true);
  assert.equal(paths.includes("/emulators/shadps4/playable/1"), false);
  assert.equal(paths.includes("/emulators/shadps4/playable/3"), false);
  assert.equal(hubPageCount(41), 2);
  assert.equal(hubPageCount(40), 1);
  assert.equal(hubPageCount(0), 1);
  assert.deepEqual(hubPageSlice(games, 2).map((item) => item.slug), ["game-40"]);
  assert.equal(parseHubPage("2"), 2);
  assert.equal(parseHubPage("1"), 1);
  assert.equal(parseHubPage("0"), null);
  assert.equal(parseHubPage("01"), null);
  assert.equal(emulatorStatusPagePath("rpcs3", "playable", 1), "/emulators/rpcs3/playable");
  assert.equal(emulatorStatusPagePath("rpcs3", "playable", 2), "/emulators/rpcs3/playable/2");
});
