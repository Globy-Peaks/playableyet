import assert from "node:assert/strict";
import test from "node:test";
import type { Catalog, RawReport } from "../types";
import { normalizedTitleCollisions, regionalVariantCollisions } from "../title-groups";
import { assembleCatalog } from "./assemble";

const reports: RawReport[] = [
  {
    emulator: "shadps4",
    titleId: "CUSA00038",
    name: "RESOGUN",
    platform: "ps4",
    status: "playable",
    updatedAt: "2026-10-15",
    sourceUrl: "https://github.com/shadps4-compatibility/shadps4-game-compatibility/issues/1",
    conceptId: "203706",
  },
  {
    emulator: "fpps4",
    titleId: "CUSA00005",
    name: "RESOGUN",
    platform: "ps4",
    status: "ingame",
    updatedAt: "2024-01-02",
    sourceUrl: "https://github.com/red-prig/fpps4-game-compatibility/issues/2",
    conceptId: "203706",
  },
  {
    emulator: "anyps5",
    titleId: "PPSA02929",
    name: "Dreaming Sarah",
    platform: "ps5",
    status: "playable",
    updatedAt: "2026-10-10",
    sourceUrl: "https://github.com/boykopovar/AnyPS5",
    note: "Officially confirmed.",
  },
];

test("groups regional releases and keeps anyps5 playable separate", () => {
  const titles = new Map([
    ["CUSA00038", { name: "RESOGUN", conceptId: "203706", regionRank: 0, region: "UP" }],
    ["CUSA00005", { name: "RESOGUN", conceptId: "203706", regionRank: 2, region: "EP" }],
  ]);
  const { catalog, changes } = assembleCatalog(reports, titles, null, "2026-10-15T00:00:00.000Z");
  assert.equal(changes, 0);
  assert.equal(catalog.games.length, 2);
  const resogun = catalog.games.find((game) => game.name.toLowerCase().includes("resogun"));
  assert.ok(resogun);
  assert.deepEqual(
    resogun.titles.map((title) => title.id).sort(),
    ["CUSA00005", "CUSA00038"],
  );
  assert.equal(resogun.titles.find((title) => title.id === "CUSA00038")?.region, "UP");
  assert.equal(resogun.titles.find((title) => title.id === "CUSA00005")?.region, "EP");
  assert.equal(resogun.reports.length, 2);
  assert.equal(resogun.history.every((event) => event.initial), true);
  const sarah = catalog.games.find((game) => game.slug === "dreaming-sarah");
  assert.equal(sarah?.reports[0]?.status, "playable");
});

test("a later snapshot replaces diacritic slugs and remembers the old ones", () => {
  const previous: Catalog = {
    generatedAt: "2026-10-16T00:00:00.000Z",
    games: [
      {
        slug: "ghost-of-y-tei",
        name: "Ghost of Yōtei",
        titles: [{ id: "PPSA26344", platform: "ps5", name: "Ghost of Yōtei", region: "JP" }],
        reports: [
          {
            emulator: "anyps5",
            titleId: "PPSA26344",
            status: "ingame",
            updatedAt: "2026-10-01",
            sourceUrl: "https://github.com/AlxcBTW/anyps5-roadmap",
          },
        ],
        history: [],
      },
    ],
  };
  const report: RawReport = {
    emulator: "anyps5",
    titleId: "PPSA26344",
    name: "Ghost of Yōtei",
    platform: "ps5",
    status: "ingame",
    updatedAt: "2026-10-01",
    sourceUrl: "https://github.com/AlxcBTW/anyps5-roadmap",
  };
  const { catalog } = assembleCatalog([report], new Map(), previous, "2026-10-20T00:00:00.000Z");
  assert.equal(catalog.games[0]?.slug, "ghost-of-yotei");
  assert.deepEqual(catalog.games[0]?.aliases, ["ghost-of-y-tei"]);
  assert.equal(catalog.games[0]?.titles[0]?.region, "JP");
});

test("apostrophes and punctuation do not split one game across two pages", () => {
  const wolverine: RawReport[] = [
    {
      emulator: "anyps5",
      titleId: "PPSA03671",
      name: "Marvel's Wolverine",
      platform: "ps5",
      status: "in-bring-up",
      updatedAt: "2026-10-20",
      sourceUrl: "https://github.com/AlxcBTW/anyps5-roadmap",
    },
    {
      emulator: "kytyps5",
      titleId: "PPSA03671",
      name: "Marvel's Wolverine",
      platform: "ps5",
      status: "boots",
      updatedAt: "2026-10-20",
      sourceUrl: "https://github.com/InoriRus/KytyPS5",
    },
    {
      emulator: "kytyps5",
      titleId: "PPSA03617",
      name: "Marvels Wolverine",
      platform: "ps5",
      status: "nothing",
      updatedAt: "2026-10-20",
      sourceUrl: "https://github.com/InoriRus/KytyPS5",
    },
  ];
  const first = assembleCatalog(wolverine, new Map(), null, "2026-10-20T06:43:00.000Z");
  assert.equal(first.catalog.games.length, 1);
  assert.equal(first.catalog.games[0]?.slug, "marvels-wolverine");
  assert.equal(first.catalog.games[0]?.name, "Marvel's Wolverine");
  assert.deepEqual(
    first.catalog.games[0]?.titles.map((title) => title.id),
    ["PPSA03617", "PPSA03671"],
  );

  const previous: Catalog = {
    generatedAt: "2026-10-20T06:43:00.000Z",
    games: [
      {
        slug: "marvel-s-wolverine",
        name: "Marvel's Wolverine",
        titles: [{ id: "PPSA03671", platform: "ps5", name: "Marvel's Wolverine" }],
        reports: wolverine.filter((report) => report.titleId === "PPSA03671").map((report) => ({
          emulator: report.emulator,
          titleId: report.titleId,
          status: report.status,
          updatedAt: report.updatedAt,
          sourceUrl: report.sourceUrl,
        })),
        history: [],
      },
      {
        slug: "marvels-wolverine",
        name: "Marvels Wolverine",
        titles: [{ id: "PPSA03617", platform: "ps5", name: "Marvels Wolverine" }],
        reports: [
          {
            emulator: "kytyps5",
            titleId: "PPSA03617",
            status: "nothing",
            updatedAt: "2026-10-20",
            sourceUrl: "https://github.com/InoriRus/KytyPS5",
          },
        ],
        history: [],
      },
    ],
  };
  const second = assembleCatalog(wolverine, new Map(), previous, "2026-10-21T06:43:00.000Z");
  assert.equal(second.catalog.games.length, 1);
  assert.equal(second.catalog.games[0]?.slug, "marvels-wolverine");
  assert.deepEqual(second.catalog.games[0]?.aliases, ["marvel-s-wolverine"]);
  assert.equal(normalizedTitleCollisions(second.catalog.games).length, 0);
});

test("sync logs normalized titles that stayed on separate pages", () => {
  const lines: string[] = [];
  const original = console.log;
  console.log = (...args: unknown[]) => {
    lines.push(args.map(String).join(" "));
  };
  try {
    const reports: RawReport[] = [
      {
        emulator: "shadps4",
        titleId: "CUSA00001",
        name: "DOOM Demo",
        platform: "ps4",
        status: "menus",
        updatedAt: "2026-10-20",
        sourceUrl: "https://github.com/shadps4-compatibility/shadps4-game-compatibility/issues/1",
      },
      {
        emulator: "shadps4",
        titleId: "CUSA00002",
        name: "DOOM (1993)",
        platform: "ps4",
        status: "playable",
        updatedAt: "2026-10-20",
        sourceUrl: "https://github.com/shadps4-compatibility/shadps4-game-compatibility/issues/2",
      },
    ];
    const titles = new Map([
      ["CUSA00001", { name: "DOOM", regionRank: 0 }],
      ["CUSA00002", { name: "DOOM", regionRank: 0 }],
    ]);
    const { catalog } = assembleCatalog(reports, titles, null, "2026-10-21T06:43:00.000Z");
    assert.equal(catalog.games.length, 2);
    assert.match(lines.join("\n"), /normalized title collision "doom":/);
  } finally {
    console.log = original;
  }
});

test("curated regional titles merge and other Future subtitles stay in the log", () => {
  const lines: string[] = [];
  const original = console.log;
  console.log = (...args: unknown[]) => {
    lines.push(args.map(String).join(" "));
  };
  try {
    const regional: RawReport[] = [
      {
        emulator: "rpcs3",
        titleId: "BCUS98127",
        name: "Ratchet & Clank Future: Tools of Destruction",
        platform: "ps3",
        status: "ingame",
        updatedAt: "2026-10-20",
        sourceUrl: "https://rpcs3.net/compatibility",
      },
      {
        emulator: "rpcs3",
        titleId: "BCES00052",
        name: "Ratchet & Clank: Tools of Destruction",
        platform: "ps3",
        status: "ingame",
        updatedAt: "2026-10-20",
        sourceUrl: "https://rpcs3.net/compatibility",
      },
      {
        emulator: "rpcs3",
        titleId: "BLUS30011",
        name: "Example Future: Subtitle Game",
        platform: "ps3",
        status: "ingame",
        updatedAt: "2026-10-20",
        sourceUrl: "https://rpcs3.net/compatibility",
      },
      {
        emulator: "rpcs3",
        titleId: "BLES30011",
        name: "Example: Subtitle Game",
        platform: "ps3",
        status: "ingame",
        updatedAt: "2026-10-20",
        sourceUrl: "https://rpcs3.net/compatibility",
      },
      {
        emulator: "shadps4",
        titleId: "CUSA03550",
        name: "Grand Theft Auto 3",
        platform: "ps4",
        status: "nothing",
        updatedAt: "2026-10-20",
        sourceUrl: "https://github.com/shadps4-compatibility/shadps4-game-compatibility/issues/3",
      },
      {
        emulator: "shadps4",
        titleId: "CUSA26613",
        name: "Grand Theft Auto III – The Definitive Edition",
        platform: "ps4",
        status: "menus",
        updatedAt: "2026-10-20",
        sourceUrl: "https://github.com/shadps4-compatibility/shadps4-game-compatibility/issues/4",
      },
    ];
    const { catalog } = assembleCatalog(regional, new Map(), null, "2026-10-21T06:43:00.000Z");
    const tools = catalog.games.find((game) => game.slug === "ratchet-clank-tools-of-destruction");
    assert.equal(tools?.name, "Ratchet & Clank: Tools of Destruction");
    assert.deepEqual(
      tools?.titles.map((title) => title.id),
      ["BCES00052", "BCUS98127"],
    );
    assert.deepEqual(tools?.aliases, ["ratchet-clank-future-tools-of-destruction"]);
    assert.equal(catalog.games.filter((game) => game.name.includes("Example")).length, 2);
    assert.equal(catalog.games.filter((game) => game.slug.startsWith("grand-theft-auto")).length, 2);
    assert.match(
      lines.join("\n"),
      /regional variant collision "example subtitle game": example-future-subtitle-game, example-subtitle-game/,
    );
    assert.equal(lines.some((line) => line.includes("tools of destruction")), false);
    assert.equal(regionalVariantCollisions(catalog.games).some((item) => item.key.includes("grand theft auto")), false);
  } finally {
    console.log = original;
  }
});

test("appends history when a later snapshot changes status", () => {
  const titles = new Map<string, { name: string; conceptId?: string; regionRank: number }>();
  const first = assembleCatalog(
    [reports[2]],
    titles,
    null,
    "2026-10-10T00:00:00.000Z",
  ).catalog;
  const changed: RawReport = { ...reports[2], status: "in-bring-up", updatedAt: "2026-10-16" };
  const second = assembleCatalog([changed], titles, first, "2026-10-16T00:00:00.000Z");
  assert.equal(second.changes, 1);
  const events = second.catalog.games[0]?.history ?? [];
  assert.equal(events.at(-1)?.from, "playable");
  assert.equal(events.at(-1)?.status, "in-bring-up");
  assert.equal(events.at(-1)?.initial, false);
});
