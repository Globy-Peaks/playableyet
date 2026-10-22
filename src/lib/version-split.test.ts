import assert from "node:assert/strict";
import test from "node:test";
import type { Game, Report, Status } from "./types";
import { versionDisagreementSentence, versionDisagreements } from "./version-split";

function report(titleId: string, status: Status, emulator: Report["emulator"] = "rpcs3"): Report {
  return {
    emulator,
    titleId,
    status,
    updatedAt: "2026-10-21",
    sourceUrl: "https://rpcs3.net/compatibility",
  };
}

function sample(reports: Report[], titles: Game["titles"] = []): Game {
  return { slug: "sample", name: "Sample", titles, reports, history: [] };
}

test("disc and digital statuses are named separately", () => {
  const game = sample([
    report("BLUS30166", "playable"),
    report("BLES00316", "playable"),
    report("NPUB30393", "ingame"),
    report("NPJB00431", "ingame"),
    report("NPEB00772", "ingame"),
  ]);
  const [item] = versionDisagreements(game);
  assert.equal(
    item ? versionDisagreementSentence(item) : "",
    "On RPCS3, the disc versions are Playable (BLES00316, BLUS30166) and the digital (PSN) versions are Ingame (NPEB00772, NPJB00431, NPUB30393).",
  );
});

test("versions that share a status do not get a callout", () => {
  const game = sample([
    report("BLES01399", "playable"),
    report("BLUS30826", "playable"),
    report("NPEB02034", "playable"),
    report("NPUB31509", "playable"),
  ]);
  assert.deepEqual(versionDisagreements(game), []);
});

test("regions are named when the same medium disagrees", () => {
  const game = sample([report("BLES00316", "ingame"), report("BLUS30166", "playable")]);
  const [item] = versionDisagreements(game);
  assert.equal(
    item ? versionDisagreementSentence(item) : "",
    "On RPCS3, the EU disc version is Ingame (BLES00316) and the US disc version is Playable (BLUS30166).",
  );
});

test("two copies with the same edition label stay attached to their title IDs", () => {
  const game = sample([report("BLUS30166", "playable"), report("BLUS30167", "ingame")]);
  const [item] = versionDisagreements(game);
  assert.equal(
    item ? versionDisagreementSentence(item) : "",
    "On RPCS3, BLUS30166 (US disc) is Playable and BLUS30167 (US disc) is Ingame.",
  );
});
