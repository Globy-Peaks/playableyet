import type { RawReport, SourceReport } from "@/lib/types";
import { extractTitleId, isTitleId, isUsefulTitle, platformFor, regionRank, splitTitleAndId } from "@/lib/identity";
import {
  mapLooseStatus,
  osFromLabels,
  statusFromLabels,
  toDay,
} from "@/lib/status";
import { fetchJson, fetchText, githubJson, mapPool, sleep } from "@/lib/sync/http";
import { mapAnyPs5, type AnyPs5BlockersFile, type AnyPs5GamesFile, type AnyPs5RoadmapFile } from "@/lib/sync/anyps5";

export type TitleInfo = {
  name: string;
  conceptId?: string;
  regionRank: number;
};

export type SourceFetch = {
  meta: SourceReport;
  reports: RawReport[];
};

const PAGE_GAP_MS = 400;

type RpcExportRow = {
  status?: string;
  date?: string;
  patchsets?: {
    packages?: { titles?: { type?: string; title?: string }[] }[];
  }[];
};

type RpcListRow = {
  title?: string;
  status?: string;
  date?: string;
};

function patchsetTitle(row: RpcExportRow): string | undefined {
  for (const set of row.patchsets ?? []) {
    for (const pkg of set.packages ?? []) {
      for (const title of pkg.titles ?? []) {
        if (title.type === "TITLE" && title.title) return title.title;
      }
    }
  }
  for (const set of row.patchsets ?? []) {
    for (const pkg of set.packages ?? []) {
      for (const title of pkg.titles ?? []) {
        if (title.title) return title.title;
      }
    }
  }
  return undefined;
}

export async function fetchRpcs3(): Promise<SourceFetch> {
  const byId = new Map<string, { status?: string; date?: string; name?: string }>();
  try {
    const exported = await fetchJson<{ results?: Record<string, RpcExportRow> }>(
      "https://rpcs3.net/compatibility?api=v1&export",
    );
    for (const [id, row] of Object.entries(exported.results ?? {})) {
      byId.set(id.toUpperCase(), {
        status: row.status,
        date: row.date,
        name: patchsetTitle(row),
      });
    }
  } catch (error) {
    return {
      reports: [],
      meta: {
        id: "rpcs3",
        ok: false,
        count: 0,
        error: error instanceof Error ? error.message : String(error),
      },
    };
  }

  let pages = 0;
  let pageError: string | undefined;
  const seenOnList = new Set<string>();
  for (let page = 1; page <= 40; page += 1) {
    if (page > 1) await sleep(PAGE_GAP_MS);
    let data: { results?: Record<string, RpcListRow> };
    try {
      data = await fetchJson(
        `https://rpcs3.net/compatibility?api=v1&r=400&p=${page}`,
      );
    } catch (error) {
      pageError = error instanceof Error ? error.message : String(error);
      break;
    }
    const entries = Object.entries(data.results ?? {});
    if (entries.length === 0) break;
    let fresh = 0;
    for (const [id, row] of entries) {
      const key = id.toUpperCase();
      if (!seenOnList.has(key)) {
        fresh += 1;
        seenOnList.add(key);
      }
      const current = byId.get(key) ?? {};
      if (row.title) current.name = row.title;
      if (!current.status && row.status) current.status = row.status;
      if (!current.date && row.date) current.date = row.date;
      byId.set(key, current);
    }
    pages += 1;
    if (fresh === 0) break;
  }

  const reports: RawReport[] = [];
  let untitled = 0;
  for (const [titleId, row] of byId) {
    if (!isTitleId(titleId)) continue;
    const status = mapLooseStatus(row.status);
    if (!status) continue;
    if (!row.name) untitled += 1;
    reports.push({
      emulator: "rpcs3",
      titleId,
      name: row.name,
      platform: "ps3",
      status,
      updatedAt: toDay(row.date),
      sourceUrl: `https://rpcs3.net/compatibility?g=${encodeURIComponent(titleId)}`,
    });
  }

  const note = [
    `${pages} title pages from the compatibility list`,
    `${untitled} serials still without a title`,
    pageError ? `title paging stopped: ${pageError}` : "",
  ]
    .filter(Boolean)
    .join(". ");

  return {
    reports,
    meta: { id: "rpcs3", ok: true, count: reports.length, note },
  };
}

type GhLabel = string | { name?: string };
type GhIssue = {
  title?: string;
  body?: string | null;
  html_url?: string;
  updated_at?: string;
  pull_request?: unknown;
  labels?: GhLabel[];
};

function labelNames(issue: GhIssue): string[] {
  return (issue.labels ?? [])
    .map((label) => (typeof label === "string" ? label : label.name ?? ""))
    .filter(Boolean);
}

function skippedLabel(labels: string[]): boolean {
  return labels.some((label) => /^(duplicate|invalid|wontfix|spam)$/i.test(label));
}

const SHAD_STATUS_LABELS = [
  "status-playable",
  "status-ingame",
  "status-menus",
  "status-boots",
  "status-nothing",
] as const;

async function githubLabeledIssues(repo: string, label: string): Promise<GhIssue[]> {
  const issues: GhIssue[] = [];
  for (let page = 1; page <= 10; page += 1) {
    if (page > 1) await sleep(PAGE_GAP_MS);
    const url = new URL(`https://api.github.com/repos/${repo}/issues`);
    url.searchParams.set("state", "all");
    url.searchParams.set("labels", label);
    url.searchParams.set("per_page", "100");
    url.searchParams.set("page", String(page));
    let pageItems: GhIssue[] = [];
    try {
      pageItems = await githubJson<GhIssue[]>(url.toString());
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // The issues list refuses pages past 1,000 results.
      if (page > 1 && message.includes("422")) break;
      throw error;
    }
    if (!Array.isArray(pageItems) || pageItems.length === 0) break;
    for (const issue of pageItems) {
      if (!issue.pull_request) issues.push(issue);
    }
    if (pageItems.length < 100) break;
  }
  return issues;
}

export async function fetchShadPs4(): Promise<SourceFetch> {
  try {
    const seen = new Set<string>();
    const issues: GhIssue[] = [];
    for (const label of SHAD_STATUS_LABELS) {
      await sleep(PAGE_GAP_MS);
      const labeled = await githubLabeledIssues(
        "shadps4-compatibility/shadps4-game-compatibility",
        label,
      );
      for (const issue of labeled) {
        const key = issue.html_url;
        if (!key || seen.has(key)) continue;
        seen.add(key);
        issues.push(issue);
      }
    }
    const reports: RawReport[] = [];
    let skipped = 0;
    for (const issue of issues) {
      const labels = labelNames(issue);
      if (skippedLabel(labels)) {
        skipped += 1;
        continue;
      }
      const status = statusFromLabels(labels);
      const titleOnly = splitTitleAndId(issue.title ?? "");
      const titleId = titleOnly.titleId ?? extractTitleId(issue.body ?? "");
      if (!status || !titleId || !issue.html_url) {
        skipped += 1;
        continue;
      }
      reports.push({
        emulator: "shadps4",
        titleId,
        name: titleOnly.name,
        platform: platformFor(titleId, "shadps4"),
        status,
        updatedAt: toDay(issue.updated_at),
        sourceUrl: issue.html_url,
        os: osFromLabels(labels),
      });
    }
    const deduped = dedupeReports(reports);
    return {
      reports: deduped,
      meta: {
        id: "shadps4",
        ok: true,
        count: deduped.length,
        note: `${issues.length} labeled issues collapsed to ${deduped.length} title IDs. ${skipped} skipped. Each status label is fetched separately so the list stays under GitHub's 1,000-result page cap.`,
      },
    };
  } catch (error) {
    return {
      reports: [],
      meta: {
        id: "shadps4",
        ok: false,
        count: 0,
        error: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

type FpRow = {
  id?: number;
  code?: string;
  title?: string;
  status?: string;
  issue_type?: string;
  updated?: string;
  labels?: string[];
};

export async function fetchFpPs4(): Promise<SourceFetch> {
  try {
    const rows = await fetchJson<FpRow[]>("https://api.fpps4.net/database.json");
    const reports: RawReport[] = [];
    let skipped = 0;
    for (const row of rows) {
      const kind = row.issue_type ?? "Game";
      if (/^system/i.test(kind)) {
        skipped += 1;
        continue;
      }
      const titleId = (row.code ?? "").toUpperCase();
      const status = mapLooseStatus(row.status);
      if (!isTitleId(titleId) || !status || !row.id) {
        skipped += 1;
        continue;
      }
      reports.push({
        emulator: "fpps4",
        titleId,
        name: row.title,
        platform: platformFor(titleId, "fpps4"),
        status,
        updatedAt: toDay(row.updated),
        sourceUrl: `https://github.com/red-prig/fpps4-game-compatibility/issues/${row.id}`,
        os: osFromLabels(row.labels ?? []),
      });
    }
    const deduped = dedupeReports(reports);
    return {
      reports: deduped,
      meta: {
        id: "fpps4",
        ok: true,
        count: deduped.length,
        note: `${rows.length} database rows. Skipped ${skipped} system-firmware or unusable rows.`,
      },
    };
  } catch (error) {
    return {
      reports: [],
      meta: {
        id: "fpps4",
        ok: false,
        count: 0,
        error: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

type GhContent = { name?: string; download_url?: string | null; type?: string };

function frontmatter(markdown: string): Record<string, string> {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const fields: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const pair = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!pair) continue;
    fields[pair[1]] = pair[2].trim().replace(/^["']|["']$/g, "");
  }
  return fields;
}

export async function fetchSharpEmu(): Promise<SourceFetch> {
  try {
    const listing = await githubJson<GhContent[]>(
      "https://api.github.com/repos/sharpemu/sharpemu-site/contents/src/content/compat",
    );
    const files = listing.filter(
      (item) => item.type === "file" && item.name?.endsWith(".md") && item.download_url,
    );
    const docs = await mapPool(files, 6, async (file) => {
      const text = await fetchText(file.download_url!);
      return { name: file.name ?? "", text };
    });
    const reports: RawReport[] = [];
    let skipped = 0;
    for (const doc of docs) {
      const fields = frontmatter(doc.text);
      const titleId = (fields.titleId || doc.name.replace(/\.md$/i, "")).toUpperCase();
      const status = mapLooseStatus(fields.status);
      if (!isTitleId(titleId) || !status) {
        skipped += 1;
        continue;
      }
      const issue = doc.text.match(
        /https:\/\/github\.com\/sharpemu\/sharpemu-site\/issues\/\d+/,
      );
      reports.push({
        emulator: "sharpemu",
        titleId,
        platform: "ps5",
        status,
        updatedAt: toDay(fields.testedDate),
        sourceUrl: issue?.[0] ?? `https://github.com/sharpemu/sharpemu-site/blob/main/src/content/compat/${titleId}.md`,
        os: fields.os ? [fields.os.toLowerCase() === "macos" ? "macos" : fields.os.toLowerCase()] : undefined,
      });
    }
    return {
      reports,
      meta: {
        id: "sharpemu",
        ok: true,
        count: reports.length,
        note: `${files.length} compatibility reports. ${skipped} skipped.`,
      },
    };
  } catch (error) {
    return {
      reports: [],
      meta: {
        id: "sharpemu",
        ok: false,
        count: 0,
        error: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

function markdownField(body: string, label: string): string {
  const pattern = new RegExp(`###\\s*${label}\\s*\\n+([^\\n]+)`, "i");
  const match = body.match(pattern);
  return match?.[1]?.trim() ?? "";
}

export async function fetchKyty(): Promise<SourceFetch> {
  try {
    const reports: RawReport[] = [];
    let total = 0;
    let skipped = 0;
    for (let page = 1; page <= 10; page += 1) {
      if (page > 1) await sleep(PAGE_GAP_MS);
      const query = encodeURIComponent('repo:KytyPS5/KytyPS5 is:issue "GAME STATUS" in:title');
      const data = await githubJson<{
        total_count?: number;
        items?: GhIssue[];
      }>(
        `https://api.github.com/search/issues?q=${query}&sort=updated&order=desc&per_page=100&page=${page}`,
      );
      total = data.total_count ?? total;
      const items = data.items ?? [];
      if (items.length === 0) break;
      for (const issue of items) {
        if (issue.pull_request) {
          skipped += 1;
          continue;
        }
        const body = issue.body ?? "";
        const titleText = markdownField(body, "Game title");
        const idText = markdownField(body, "Game ID / serial");
        const statusText =
          markdownField(body, "Compatibility status") ||
          (issue.title ?? "").replace(/^\[GAME STATUS\]:\s*/i, "");
        const titleId = extractTitleId(`${idText}\n${issue.title ?? ""}\n${body}`);
        const status = mapLooseStatus(statusText);
        if (!titleId || !isTitleId(titleId) || !status || !issue.html_url) {
          skipped += 1;
          continue;
        }
        const name = titleText && !/^_?no response_?$/i.test(titleText) ? titleText : splitTitleAndId(issue.title ?? "").name;
        reports.push({
          emulator: "kytyps5",
          titleId,
          name,
          platform: platformFor(titleId, "kytyps5"),
          status,
          updatedAt: toDay(issue.updated_at),
          sourceUrl: issue.html_url,
        });
      }
      if (items.length < 100 || page * 100 >= Math.min(total, 1000)) break;
    }
    const deduped = dedupeReports(reports);
    const capped = total > 1000 ? " Search API returned the 1000 most recently updated issues." : "";
    return {
      reports: deduped,
      meta: {
        id: "kytyps5",
        ok: true,
        count: deduped.length,
        note: `${total} GAME STATUS issues matched, ${skipped} skipped.${capped}`,
      },
    };
  } catch (error) {
    return {
      reports: [],
      meta: {
        id: "kytyps5",
        ok: false,
        count: 0,
        error: error instanceof Error ? error.message : String(error),
        note: "KytyPS5 community list could not be read. The rest of the sync continues.",
      },
    };
  }
}

export async function fetchAnyPs5(): Promise<SourceFetch> {
  try {
    const gamesFile = await fetchJson<AnyPs5GamesFile>(
      "https://raw.githubusercontent.com/AlxcBTW/anyps5-roadmap/main/data/games.json",
    );
    let roadmap: AnyPs5RoadmapFile | null = null;
    let blockers: AnyPs5BlockersFile | null = null;
    try {
      roadmap = await fetchJson<AnyPs5RoadmapFile>(
        "https://raw.githubusercontent.com/AlxcBTW/anyps5-roadmap/main/site/roadmap.json",
      );
    } catch {
      blockers = await fetchJson<AnyPs5BlockersFile>(
        "https://raw.githubusercontent.com/AlxcBTW/anyps5-roadmap/main/data/blockers.json",
      );
    }
    const mapped = mapAnyPs5({ gamesFile, roadmap, blockers });
    return {
      reports: dedupeReports(mapped.reports),
      meta: {
        id: "anyps5",
        ok: true,
        count: dedupeReports(mapped.reports).length,
        note: mapped.note,
      },
    };
  } catch (error) {
    return {
      reports: [],
      meta: {
        id: "anyps5",
        ok: false,
        count: 0,
        error: error instanceof Error ? error.message : String(error),
        note: "AnyPS5 roadmap could not be read.",
      },
    };
  }
}

export async function fetchTitleIndex(): Promise<{
  titles: Map<string, TitleInfo>;
  meta: SourceReport;
}> {
  const titles = new Map<string, TitleInfo>();
  try {
    const [ps4, ps5] = await Promise.all([
      fetchText("https://raw.githubusercontent.com/andshrew/PlayStation-Titles/main/PS4_Titles.tsv"),
      fetchText("https://raw.githubusercontent.com/andshrew/PlayStation-Titles/main/PS5_Titles.tsv"),
    ]);
    ingestTitles(titles, ps4);
    ingestTitles(titles, ps5);
    return {
      titles,
      meta: {
        id: "playstation-titles",
        ok: true,
        count: titles.size,
        note: "MIT-licensed andshrew/PlayStation-Titles PS4 and PS5 name index. PS3 names come from the RPCS3 list.",
      },
    };
  } catch (error) {
    return {
      titles,
      meta: {
        id: "playstation-titles",
        ok: false,
        count: 0,
        error: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

function ingestTitles(target: Map<string, TitleInfo>, tsv: string) {
  const lines = tsv.split(/\r?\n/);
  const header = lines[0]?.split("\t") ?? [];
  const idCol = header.indexOf("titleId");
  const conceptCol = header.indexOf("conceptId");
  const nameCol = header.indexOf("name");
  const regionCol = header.indexOf("region");
  if (idCol < 0 || nameCol < 0) return;
  for (const line of lines.slice(1)) {
    if (!line) continue;
    const cols = line.split("\t");
    const rawId = cols[idCol] ?? "";
    const titleId = rawId.replace(/_\d+$/, "").toUpperCase();
    const name = cols[nameCol] ?? "";
    if (!isTitleId(titleId) || !isUsefulTitle(name)) continue;
    const rank = regionRank(cols[regionCol]);
    const conceptId = conceptCol >= 0 ? cols[conceptCol] : undefined;
    const existing = target.get(titleId);
    if (!existing || rank < existing.regionRank) {
      target.set(titleId, {
        name,
        conceptId: conceptId || existing?.conceptId,
        regionRank: rank,
      });
    } else if (existing && !existing.conceptId && conceptId) {
      existing.conceptId = conceptId;
    }
  }
}

export function dedupeReports(reports: RawReport[]): RawReport[] {
  const byKey = new Map<string, RawReport>();
  for (const report of reports) {
    const key = `${report.emulator}:${report.titleId}`;
    const current = byKey.get(key);
    if (!current) {
      byKey.set(key, { ...report, os: report.os ? [...report.os] : undefined });
      continue;
    }
    const reportRank = statusRank(report.status);
    const currentRank = statusRank(current.status);
    const same = reportRank === currentRank;
    if (reportRank > currentRank || (same && report.updatedAt > current.updatedAt)) {
      const os = same ? mergeOs(current.os, report.os) : report.os;
      byKey.set(key, { ...report, os });
    } else if (same) {
      current.os = mergeOs(current.os, report.os);
      if (!current.name && report.name) current.name = report.name;
    }
  }
  return [...byKey.values()];
}

function mergeOs(left?: string[], right?: string[]) {
  const set = new Set([...(left ?? []), ...(right ?? [])]);
  return set.size ? [...set].sort() : undefined;
}

function statusRank(status: RawReport["status"]) {
  const order = ["playable", "ingame", "intro", "menus", "loadable", "boots", "in-bring-up", "nothing"];
  return order.indexOf(status) * -1;
}
