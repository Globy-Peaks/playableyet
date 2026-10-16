import assert from "node:assert/strict";
import test from "node:test";
import { mapAnyPs5, type AnyPs5GamesFile, type AnyPs5RoadmapFile } from "./anyps5";

const gamesFile: AnyPs5GamesFile = {
  games: [
    {
      name: "Joined Example",
      title_ids: ["PPSA11111", "PPSA11112"],
    },
  ],
  distinct: [{ title_ids: ["PPSA99288", "PPSA99997"], reason: "Separate homebrew apps." }],
};

const roadmap: AnyPs5RoadmapFile = {
  games: [
    {
      id: "dreaming-sarah",
      name: "Dreaming Sarah",
      title_ids: ["PPSA02929"],
      stage: {
        stage: "Playable",
        date: "2026-10-10",
        build: "main",
        os: "Windows",
        url: "https://github.com/boykopovar/AnyPS5/discussions/2475",
        verified: true,
      },
      confidence: { label: "Checked by hand" },
      open_blockers: [],
    },
    {
      id: "animal-well",
      name: "Animal Well",
      title_ids: ["PPSA22520"],
      stage: {
        stage: "Playable",
        date: "2026-10-10",
        url: "https://github.com/Zibo176/SilkSongFork/issues/1",
      },
      open_blockers: [{ id: "2548", why: "latest recorded stop matches its signature" }],
    },
    {
      id: "returnal",
      name: "Returnal",
      title_ids: ["PPSA01284", "PPSA01285"],
      stage: { stage: "Menus", date: "2026-09-27", os: "Windows", gpu: "NVIDIA", build: "main" },
      open_blockers: [{ id: "3274", why: "shader abort" }],
    },
  ],
  blockers: [
    {
      id: "2548",
      title: "Packed pixel ancillary word",
      url: "https://github.com/boykopovar/AnyPS5/issues/2548",
      status: "open",
    },
    {
      id: "3274",
      title: "Deferred compute shader aborts",
      url: "https://github.com/boykopovar/AnyPS5/issues/3274",
      status: "open",
    },
  ],
};

test("maps roadmap stages and keeps playable official-only", () => {
  const mapped = mapAnyPs5({ gamesFile, roadmap });
  assert.equal(mapped.joinGroups, 1);
  assert.equal(mapped.distinctGroups, 1);
  const sarah = mapped.reports.find((report) => report.titleId === "PPSA02929");
  const animal = mapped.reports.find((report) => report.titleId === "PPSA22520");
  const returnal = mapped.reports.filter((report) => report.name === "Returnal");
  assert.equal(sarah?.status, "playable");
  assert.equal(sarah?.bringUp?.stage, "Playable");
  assert.equal(animal?.status, "in-bring-up");
  assert.equal(animal?.bringUp?.stage, "Playable");
  assert.equal(animal?.bringUp?.blockers[0]?.id, "2548");
  assert.equal(animal?.bringUp?.blockers[0]?.title, "Packed pixel ancillary word");
  assert.equal(animal?.sourceUrl, "https://github.com/boykopovar/AnyPS5");
  assert.equal(returnal.length, 2);
  assert.equal(returnal[0]?.conceptId, returnal[1]?.conceptId);
  assert.equal(returnal[0]?.bringUp?.stage, "Menus");
  const joined = mapped.reports.filter((report) => report.conceptId === "anyps5-join:0");
  assert.deepEqual(
    joined.map((report) => report.titleId).sort(),
    ["PPSA11111", "PPSA11112"],
  );
  assert.equal(joined[0]?.status, "in-bring-up");
  assert.equal(joined[0]?.bringUp?.stage, null);
});
