import { EMULATORS } from "@/lib/emulators";
import { STATUS_LABEL } from "@/lib/status";
import { classifyTitleId, titleEditionLabel, type TitleMedium } from "@/lib/title-edition";
import { EMULATOR_IDS, type EmulatorId, type Game, type Status } from "@/lib/types";

export type VersionGroup = {
  label: string;
  status: Status;
  titleIds: string[];
};

export type VersionDisagreement = {
  emulator: EmulatorId;
  groups: VersionGroup[];
};

const MEDIUM_ORDER: TitleMedium[] = ["disc", "digital", "unknown"];

const MEDIUM_LABEL: Record<TitleMedium, string> = {
  disc: "disc",
  digital: "digital (PSN)",
  unknown: "format unknown",
};

type Row = {
  titleId: string;
  status: Status;
  medium: TitleMedium;
  label: string;
};

/** Title IDs on one project that do not share a status. Empty when they agree. */
export function versionDisagreements(game: Game): VersionDisagreement[] {
  const found: VersionDisagreement[] = [];
  for (const emulator of EMULATOR_IDS) {
    const reports = game.reports.filter((report) => report.emulator === emulator);
    if (reports.length < 2) continue;
    const statuses = new Set(reports.map((report) => report.status));
    if (statuses.size < 2) continue;
    const rows = reports.map((report) => {
      const region = game.titles.find((title) => title.id === report.titleId)?.region;
      const classified = classifyTitleId(report.titleId, region);
      return {
        titleId: report.titleId,
        status: report.status,
        medium: classified.medium,
        label: titleEditionLabel(report.titleId, region),
      };
    });
    found.push({ emulator, groups: groupRows(rows) });
  }
  return found;
}

export function versionDisagreementSentence(item: VersionDisagreement): string {
  const name = EMULATORS[item.emulator].name;
  return `On ${name}, ${joinClauses(item.groups.map(phrase))}.`;
}

function groupRows(rows: Row[]): VersionGroup[] {
  const byMedium = new Map<TitleMedium, Row[]>();
  for (const row of rows) {
    const list = byMedium.get(row.medium) ?? [];
    list.push(row);
    byMedium.set(row.medium, list);
  }
  const groups: VersionGroup[] = [];
  for (const medium of MEDIUM_ORDER) {
    const list = byMedium.get(medium);
    if (!list?.length) continue;
    if (sameStatus(list)) {
      groups.push({ label: MEDIUM_LABEL[medium], status: list[0].status, titleIds: titleIds(list) });
      continue;
    }
    groups.push(...splitByEdition(list));
  }
  return groups;
}

function splitByEdition(rows: Row[]): VersionGroup[] {
  const byLabel = new Map<string, Row[]>();
  for (const row of rows) {
    const list = byLabel.get(row.label) ?? [];
    list.push(row);
    byLabel.set(row.label, list);
  }
  const groups: VersionGroup[] = [];
  for (const label of [...byLabel.keys()].sort((a, b) => a.localeCompare(b))) {
    const list = byLabel.get(label) ?? [];
    if (sameStatus(list)) {
      groups.push({ label, status: list[0].status, titleIds: titleIds(list) });
      continue;
    }
    for (const row of [...list].sort((a, b) => a.titleId.localeCompare(b.titleId))) {
      groups.push({
        label: `${row.titleId} (${row.label})`,
        status: row.status,
        titleIds: [row.titleId],
      });
    }
  }
  return groups;
}

function phrase(group: VersionGroup): string {
  const status = STATUS_LABEL[group.status];
  const ids = group.titleIds.join(", ");
  const single = group.titleIds.length === 1;
  if (single && group.label.startsWith(group.titleIds[0] ?? "")) {
    return `${group.label} is ${status}`;
  }
  const versions = single ? "version is" : "versions are";
  if (group.label === "format unknown") {
    const noun = single ? "version with an unknown format is" : "versions with an unknown format are";
    return `the ${noun} ${status} (${ids})`;
  }
  return `the ${group.label} ${versions} ${status} (${ids})`;
}

function titleIds(rows: Row[]): string[] {
  return rows.map((row) => row.titleId).sort((a, b) => a.localeCompare(b));
}

function sameStatus(rows: Row[]): boolean {
  const status = rows[0]?.status;
  return rows.every((row) => row.status === status);
}

function joinClauses(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items.at(-1)}`;
}
