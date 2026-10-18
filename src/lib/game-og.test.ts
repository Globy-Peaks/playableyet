import assert from "node:assert/strict";
import test from "node:test";
import { ogStatusLines } from "./game-og";
import type { Game } from "./types";

test("the share image lists only projects present in the snapshot", () => {
  const game: Game = {
    slug: "knack-2",
    name: "Knack 2",
    titles: [],
    reports: [
      {
        emulator: "shadps4",
        titleId: "CUSA00001",
        status: "nothing",
        updatedAt: "2026-10-16",
        sourceUrl: "https://shadps4.net/compatibility/",
      },
      {
        emulator: "fpps4",
        titleId: "CUSA00001",
        status: "ingame",
        updatedAt: "2026-10-16",
        sourceUrl: "https://fpps4.net/compatibility/",
      },
    ],
    history: [],
  };
  assert.deepEqual(ogStatusLines(game), [
    { project: "shadPS4", label: "Nothing" },
    { project: "fpPS4", label: "Ingame" },
  ]);
});
