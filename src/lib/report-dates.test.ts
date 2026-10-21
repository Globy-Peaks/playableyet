import assert from "node:assert/strict";
import test from "node:test";
import { latestStatusChangeAt } from "./report-dates";
import type { HistoryEvent } from "./types";

test("status last changed ignores the first observation and keeps the latest change", () => {
  const history: HistoryEvent[] = [
    { emulator: "rpcs3", titleId: "BLUS30166", status: "ingame", at: "2026-05-08", initial: true },
    {
      emulator: "rpcs3",
      titleId: "BLES00316",
      status: "playable",
      from: "ingame",
      at: "2026-10-21",
      initial: false,
    },
    {
      emulator: "rpcs3",
      titleId: "BLUS30166",
      status: "playable",
      from: "ingame",
      at: "2026-10-21",
      initial: false,
    },
    {
      emulator: "rpcs3",
      titleId: "BLUS30166",
      status: "ingame",
      from: "nothing",
      at: "2026-10-01",
      initial: false,
    },
  ];
  assert.equal(latestStatusChangeAt(history, "rpcs3", "BLUS30166"), "2026-10-21");
  assert.equal(latestStatusChangeAt(history, "rpcs3", "NPEB00772"), null);
});
