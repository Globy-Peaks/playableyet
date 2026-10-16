import { isTitleId } from "@/lib/identity";
import { allowedHttpUrl } from "@/lib/site";
import { toDay } from "@/lib/status";
import type { BringUp, OpenBlocker, RawReport } from "@/lib/types";

export const ANYPS5_OFFICIAL_REPO = "https://github.com/boykopovar/AnyPS5";
export const ANYPS5_OFFICIAL_SITE = "https://boykopovar.github.io/AnyPS5/";
export const ANYPS5_ROADMAP_SITE = "https://alxcbtw.github.io/anyps5-roadmap/";
export const ANYPS5_ROADMAP_REPO = "https://github.com/AlxcBTW/anyps5-roadmap";

/** Officially confirmed playable titles. Community roadmap stages never add to this set. */
const OFFICIAL_PLAYABLE = new Set(["PPSA02929"]);

export function anyps5RoadmapGameUrl(titleId: string) {
  return `${ANYPS5_ROADMAP_SITE}#/games/${titleId}`;
}

export type AnyPs5GamesFile = {
  games?: {
    name?: string;
    title_ids?: string[];
    titleIds?: string[];
  }[];
  distinct?: { title_ids?: string[]; titleIds?: string[]; reason?: string }[];
};

type RoadmapStage = {
  stage?: string;
  date?: string;
  build?: string;
  os?: string | null;
  gpu?: string | null;
  url?: string;
  note?: string | null;
  verified?: boolean;
};

type RoadmapBlockerRef = { id?: string; why?: string; title?: string };

type RoadmapGame = {
  id?: string;
  name?: string;
  title_ids?: string[];
  stage?: RoadmapStage | null;
  confidence?: { label?: string } | null;
  open_blockers?: RoadmapBlockerRef[];
  last_evidence?: { date?: string } | null;
};

type RoadmapBlocker = { id?: string; title?: string; url?: string; status?: string };

export type AnyPs5RoadmapFile = {
  generated_at?: string;
  games?: RoadmapGame[];
  blockers?: RoadmapBlocker[];
};

type CuratedTitle = {
  id?: string;
  name?: string;
  evidence?: RoadmapStage[];
  blockers?: { id?: string; why?: string }[];
};

export type AnyPs5BlockersFile = {
  verified?: string;
  titles?: CuratedTitle[];
  blockers?: { id?: string; title?: string; sources?: string[] }[];
};

export type AnyPs5MapResult = {
  reports: RawReport[];
  joinGroups: number;
  distinctGroups: number;
  roadmapGames: number;
  withStage: number;
  withOpenBlockers: number;
  note: string;
};

const STAGE_RANK = [
  "converts",
  "loads",
  "starts",
  "first draw",
  "presents",
  "menus",
  "ingame",
  "playable",
];

export function mapAnyPs5(input: {
  gamesFile: AnyPs5GamesFile;
  roadmap?: AnyPs5RoadmapFile | null;
  blockers?: AnyPs5BlockersFile | null;
}): AnyPs5MapResult {
  const joins = joinGroups(input.gamesFile);
  const distinctGroups = (input.gamesFile.distinct ?? []).filter((entry) => titleIdsOf(entry).length > 0).length;
  const joinConcept = new Map<string, string>();
  joins.forEach((group, index) => {
    for (const id of group.ids) joinConcept.set(id, `anyps5-join:${index}`);
  });

  const fromRoadmap = input.roadmap?.games?.length
    ? reportsFromRoadmap(input.roadmap, joinConcept)
    : [];
  const reports = fromRoadmap.length
    ? fromRoadmap
    : reportsFromCurated(input.blockers, joinConcept);

  addJoinOnlyReports(reports, joins);

  const withStage = reports.filter((report) => report.bringUp?.stage).length;
  const withOpenBlockers = reports.filter((report) => (report.bringUp?.blockers.length ?? 0) > 0).length;
  const source = fromRoadmap.length ? "built roadmap" : "curated titles";
  const roadmapGames = fromRoadmap.length ? (input.roadmap?.games?.length ?? 0) : (input.blockers?.titles?.length ?? 0);
  const note = [
    `games.json joins: ${joins.length} (games[] groups title IDs; distinct keeps ${distinctGroups} apart).`,
    `${source}: ${roadmapGames} games, ${reports.length} title IDs, ${withStage} with a stage, ${withOpenBlockers} with open blockers.`,
    "Playable only for officially confirmed PPSA02929 Dreaming Sarah.",
  ].join(" ");

  return {
    reports,
    joinGroups: joins.length,
    distinctGroups,
    roadmapGames,
    withStage,
    withOpenBlockers,
    note,
  };
}

function reportsFromRoadmap(roadmap: AnyPs5RoadmapFile, joinConcept: Map<string, string>): RawReport[] {
  const blockers = new Map<string, { title: string; url?: string }>();
  for (const blocker of roadmap.blockers ?? []) {
    if (!blocker.id) continue;
    blockers.set(blocker.id, { title: clean(blocker.title), url: blocker.url });
  }
  const reports: RawReport[] = [];
  const seen = new Set<string>();
  for (const game of roadmap.games ?? []) {
    const ids = (game.title_ids ?? []).map((id) => id.toUpperCase()).filter(isTitleId);
    const concept = game.id ? `anyps5:${game.id}` : undefined;
    for (const titleId of ids) {
      if (seen.has(titleId)) continue;
      seen.add(titleId);
      reports.push(
        toReport({
          titleId,
          name: game.name,
          conceptId: joinConcept.get(titleId) ?? concept,
          stage: game.stage ?? null,
          confidence: game.confidence?.label,
          updatedAt: game.stage?.date || game.last_evidence?.date,
          blockers: (game.open_blockers ?? []).map((item) => describeBlocker(item, blockers)),
        }),
      );
    }
  }
  return reports;
}

function reportsFromCurated(file: AnyPs5BlockersFile | null | undefined, joinConcept: Map<string, string>): RawReport[] {
  if (!file) return [];
  const blockers = new Map<string, { title: string; url?: string }>();
  for (const blocker of file.blockers ?? []) {
    if (!blocker.id) continue;
    blockers.set(blocker.id, { title: clean(blocker.title), url: blocker.sources?.[0] });
  }
  const reports: RawReport[] = [];
  for (const title of file.titles ?? []) {
    const titleId = (title.id ?? "").toUpperCase();
    if (!isTitleId(titleId)) continue;
    const stage = bestEvidence(title.evidence ?? []);
    reports.push(
      toReport({
        titleId,
        name: title.name,
        conceptId: joinConcept.get(titleId),
        stage,
        updatedAt: stage?.date || file.verified,
        blockers: (title.blockers ?? []).map((item) => describeBlocker(item, blockers)),
      }),
    );
  }
  return reports;
}

function addJoinOnlyReports(
  reports: RawReport[],
  joins: { name?: string; ids: string[] }[],
) {
  const seen = new Set(reports.map((report) => report.titleId));
  for (const [index, group] of joins.entries()) {
    for (const titleId of group.ids) {
      if (seen.has(titleId)) continue;
      seen.add(titleId);
      reports.push(
        toReport({
          titleId,
          name: group.name,
          conceptId: `anyps5-join:${index}`,
          stage: null,
          blockers: [],
        }),
      );
    }
  }
}

function toReport(input: {
  titleId: string;
  name?: string;
  conceptId?: string;
  stage: RoadmapStage | null;
  confidence?: string;
  updatedAt?: string;
  blockers: OpenBlocker[];
}): RawReport {
  const official = OFFICIAL_PLAYABLE.has(input.titleId);
  const stageName = input.stage?.stage?.trim() || null;
  const bringUp: BringUp = {
    stage: stageName,
    detail: stageDetail(input.stage, input.confidence),
    blockers: input.blockers,
  };
  const os = normalizeOs(input.stage?.os);
  return {
    emulator: "anyps5",
    titleId: input.titleId,
    name: official ? "Dreaming Sarah" : input.name,
    platform: "ps5",
    conceptId: input.conceptId,
    status: official ? "playable" : "in-bring-up",
    updatedAt: toDay(input.updatedAt),
    sourceUrl: allowedHttpUrl(input.stage?.url ?? "", ANYPS5_OFFICIAL_REPO),
    ...(os ? { os: [os] } : {}),
    note: official
      ? "Officially confirmed. Currently the only AnyPS5 title marked Playable."
      : "In bring-up. A community stage is not treated as Playable.",
    bringUp,
  };
}

function describeBlocker(
  item: { id?: string; why?: string },
  catalog: Map<string, { title: string; url?: string }>,
): OpenBlocker {
  const id = item.id?.trim() || "unknown";
  const known = catalog.get(id);
  const why = usefulWhy(item.why);
  const title = known?.title || why || "Open blocker";
  const url = known?.url ? allowedHttpUrl(known.url, "") : "";
  return {
    id,
    title: title.length > 160 ? `${title.slice(0, 157)}...` : title,
    ...(url ? { url } : {}),
  };
}

function usefulWhy(why: string | undefined) {
  const text = clean(why);
  if (!text) return "";
  if (/latest recorded stop matches its signature/i.test(text)) return "";
  return text;
}

function stageDetail(stage: RoadmapStage | null, confidence?: string) {
  if (!stage?.stage) return confidence || undefined;
  const where = [stage.os, stage.gpu].filter((part): part is string => Boolean(part)).join("/");
  const parts = [stage.date, stage.build, where, confidence].filter((part): part is string => Boolean(part));
  return parts.join(" · ") || undefined;
}

function bestEvidence(evidence: RoadmapStage[]): RoadmapStage | null {
  let best: RoadmapStage | null = null;
  let rank = -1;
  for (const item of evidence) {
    const next = STAGE_RANK.indexOf((item.stage ?? "").toLowerCase());
    if (next > rank) {
      best = item;
      rank = next;
    }
  }
  return best;
}

function joinGroups(file: AnyPs5GamesFile): { name?: string; ids: string[] }[] {
  const groups: { name?: string; ids: string[] }[] = [];
  for (const game of file.games ?? []) {
    const ids = titleIdsOf(game);
    if (ids.length) groups.push({ name: game.name, ids });
  }
  return groups;
}

function titleIdsOf(entry: { title_ids?: string[]; titleIds?: string[] }) {
  return [...new Set((entry.title_ids ?? entry.titleIds ?? []).map((id) => id.toUpperCase()).filter(isTitleId))];
}

function normalizeOs(os: string | null | undefined) {
  const value = os?.trim().toLowerCase();
  if (!value) return undefined;
  if (value === "mac" || value === "macos" || value === "osx") return "macos";
  if (value === "windows" || value === "win") return "windows";
  if (value === "linux") return "linux";
  return value;
}

function clean(value: string | undefined) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}
