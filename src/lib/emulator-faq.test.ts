import assert from "node:assert/strict";
import test from "node:test";
import { emulatorFaq } from "./emulator-faq";
import type { EmulatorCoverage } from "./hubs";

test("the RPCS3 answer names games, the percentage, and title IDs", () => {
  const coverage: EmulatorCoverage = {
    emulator: "rpcs3",
    games: 2,
    playableGames: 1,
    titleIds: 3,
    playableTitleIds: 1,
  };
  const [entry] = emulatorFaq(coverage);
  assert.equal(entry?.question, "How many PS3 games are playable on RPCS3?");
  assert.match(entry?.answer ?? "", /1 of 2 games is Playable on RPCS3 in this snapshot \(50%\)/);
  assert.match(entry?.answer ?? "", /1 of 3 RPCS3 title ID reports is Playable/);
  assert.match(entry?.answer ?? "", /not copied from a project announcement/);
  assert.equal((entry?.answer ?? "").includes("2855"), false);
  assert.equal((entry?.answer ?? "").includes("80.02"), false);
  assert.equal((entry?.answer ?? "").includes("33.3%"), false);
});

test("KytyPS5 does not gain a Playable definition", () => {
  const [entry] = emulatorFaq({
    emulator: "kytyps5",
    games: 4,
    playableGames: 0,
    titleIds: 4,
    playableTitleIds: 0,
  });
  assert.equal(entry?.question, "How many PS5 games are playable on KytyPS5?");
  assert.match(entry?.answer ?? "", /0 of 4 games are Playable on KytyPS5 in this snapshot \(0%\)/);
  assert.match(entry?.answer ?? "", /does not publish a Playable definition/);
});

test("AnyPS5 stays a porting layer in the count", () => {
  const [entry] = emulatorFaq({
    emulator: "anyps5",
    games: 2,
    playableGames: 1,
    titleIds: 2,
    playableTitleIds: 1,
  });
  assert.match(entry?.answer ?? "", /^AnyPS5 is a porting layer, not an emulator\./);
  assert.match(entry?.answer ?? "", /1 of 2 games is Playable on AnyPS5 in this snapshot \(50%\)/);
});
