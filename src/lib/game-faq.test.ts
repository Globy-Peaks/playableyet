import assert from "node:assert/strict";
import test from "node:test";
import { faqPageJsonLd, gameFaq } from "./game-faq";
import type { Game } from "./types";

function game(partial: Partial<Game> & Pick<Game, "name" | "reports">): Game {
  return {
    slug: partial.slug ?? "sample",
    name: partial.name,
    titles: partial.titles ?? [],
    reports: partial.reports,
    history: [],
  };
}

test("a playable report is named and not turned into a promise", () => {
  const [pc, best] = gameFaq(
    game({
      name: "Dreaming Sarah",
      reports: [
        {
          emulator: "anyps5",
          titleId: "PPSA02929",
          status: "playable",
          updatedAt: "2026-10-14",
          sourceUrl: "https://github.com/boykopovar/AnyPS5",
        },
        {
          emulator: "sharpemu",
          titleId: "PPSA02929",
          status: "ingame",
          updatedAt: "2026-10-14",
          sourceUrl: "https://sharpemu.app/compatibility/",
        },
      ],
    }),
  );
  assert.equal(pc?.question, "Is Dreaming Sarah playable on PC?");
  assert.match(pc?.answer ?? "", /marked Playable on AnyPS5/);
  assert.match(pc?.answer ?? "", /not a claim that every PC setup can finish the game/);
  assert.match(best?.answer ?? "", /SharpEmu Ingame/);
  assert.match(best?.answer ?? "", /not a measured performance ranking/);
  assert.match(best?.answer ?? "", /porting layer, not an emulator/);
  assert.equal((best?.answer ?? "").includes("90%"), false);
});

test("nothing playable stays nothing playable", () => {
  const [pc] = gameFaq(
    game({
      name: "Knack 2",
      reports: [
        {
          emulator: "shadps4",
          titleId: "CUSA00001",
          status: "nothing",
          updatedAt: "2026-10-16",
          sourceUrl: "https://shadps4.net/compatibility/",
        },
      ],
    }),
  );
  assert.match(pc?.answer ?? "", /no tracked project marks Knack 2 as Playable/);
  assert.match(pc?.answer ?? "", /black screen/);
});

test("FAQ structured data repeats the same two snapshot answers", () => {
  const game = {
    slug: "sample",
    name: "Sample",
    titles: [],
    reports: [],
    history: [],
  };
  const json = faqPageJsonLd(gameFaq(game));
  assert.equal(json["@type"], "FAQPage");
  assert.equal(json.mainEntity.length, 2);
  assert.equal(json.mainEntity[0]?.name, "Is Sample playable on PC?");
  assert.equal(json.mainEntity[0]?.acceptedAnswer.text, gameFaq(game)[0]?.answer);
});
