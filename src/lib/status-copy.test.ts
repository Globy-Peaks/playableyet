import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { documentedStatuses, statusGloss, statusPhrase } from "./status-copy";
import { EMULATOR_IDS } from "./types";

test("shadPS4 Nothing keeps the raw label and the project's own meaning", () => {
  assert.equal(
    statusPhrase("shadps4", "nothing"),
    "Nothing (crashes when trying to launch or hangs on a black screen)",
  );
});

test("KytyPS5 has no published Playable definition", () => {
  assert.equal(statusGloss("kytyps5", "playable"), null);
  assert.equal(statusPhrase("kytyps5", "playable"), "Playable");
  assert.match(statusGloss("kytyps5", "ingame") ?? "", /controllable gameplay/);
});

test("RPCS3 Intro is not rewritten as Menus", () => {
  assert.match(statusGloss("rpcs3", "intro") ?? "", /does not get past the menus/);
  assert.equal(statusGloss("rpcs3", "menus"), null);
});

test("the long guide quotes every documented gloss and no others", () => {
  const text = readFileSync("public/llms-full.txt", "utf8");
  for (const emulator of EMULATOR_IDS) {
    for (const entry of documentedStatuses(emulator)) {
      assert.equal(text.includes(entry.gloss), true, `${emulator} ${entry.status}`);
    }
  }
  assert.match(text, /KytyPS5 does not publish a Playable definition/);
});
