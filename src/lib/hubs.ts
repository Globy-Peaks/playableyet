import { EMULATORS, PLATFORM_LABEL, emulatorPlatform } from "@/lib/emulators";
import { STATUS_LABEL, STATUS_RANK, bestStatus } from "@/lib/status";
import { EMULATOR_IDS, PLATFORMS, STATUSES, type Catalog, type EmulatorId, type Game, type Platform, type Report, type Status } from "@/lib/types";

export const HUB_PAGE_SIZE = 40;

export function isEmulatorId(value: string): value is EmulatorId {
  return (EMULATOR_IDS as readonly string[]).includes(value);
}

export function isStatusId(value: string): value is Status {
  return (STATUSES as readonly string[]).includes(value);
}

export function isPlatformId(value: string): value is Platform {
  return (PLATFORMS as readonly string[]).includes(value);
}

export function gamesOnPlatform(catalog: Catalog, platform: Platform): Game[] {
  return catalog.games.filter(
    (game) =>
      game.titles.some((title) => title.platform === platform) ||
      game.reports.some((report) => emulatorPlatform(report.emulator) === platform),
  );
}

export function gamesOnEmulator(catalog: Catalog, emulator: EmulatorId): Game[] {
  return catalog.games.filter((game) => game.reports.some((report) => report.emulator === emulator));
}

export function reportsInPlatform(game: Game, platform: Platform): Report[] {
  return game.reports.filter((report) => emulatorPlatform(report.emulator) === platform);
}

export function reportsOnEmulator(game: Game, emulator: EmulatorId): Report[] {
  return game.reports.filter((report) => report.emulator === emulator);
}

export function countByBestStatus(games: Game[], reportsOf: (game: Game) => Report[]): { status: Status; games: number }[] {
  const counts = new Map<Status, number>(STATUSES.map((status) => [status, 0]));
  for (const game of games) {
    const status = bestStatus(reportsOf(game).map((report) => report.status));
    if (!status) continue;
    counts.set(status, (counts.get(status) ?? 0) + 1);
  }
  return STATUSES.map((status) => ({ status, games: counts.get(status) ?? 0 }));
}

export function gamesWithBestStatus(games: Game[], reportsOf: (game: Game) => Report[], status: Status): Game[] {
  return games.filter((game) => bestStatus(reportsOf(game).map((report) => report.status)) === status);
}

export function rankHubGames(games: Game[], reportsOf: (game: Game) => Report[]): Game[] {
  return [...games].sort((a, b) => {
    const left = bestStatus(reportsOf(a).map((report) => report.status));
    const right = bestStatus(reportsOf(b).map((report) => report.status));
    const delta = (right ? STATUS_RANK[right] : 0) - (left ? STATUS_RANK[left] : 0);
    return delta || a.name.localeCompare(b.name) || a.slug.localeCompare(b.slug);
  });
}

export function hubRows(games: Game[], reportsOf: (game: Game) => Report[]) {
  return games.map((game) => {
    const reports = reportsOf(game);
    const status = bestStatus(reports.map((report) => report.status));
    const match = status ? reports.find((report) => report.status === status) : undefined;
    const note = match && status ? `${EMULATORS[match.emulator].name} ${STATUS_LABEL[status]}` : "No report in this snapshot";
    return { slug: game.slug, name: game.name, status, note };
  });
}

function countWord(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}

function formatCount(count: number): string {
  return count.toLocaleString("en-US");
}

/**
 * Playable games divided by games that have a report.
 * One decimal when the rounded tenth is not zero. Null when there is no denominator.
 */
export function formatPlayablePercent(playable: number, total: number): string | null {
  if (total <= 0) return null;
  const rounded = Math.round((playable / total) * 1000) / 10;
  if (!Number.isFinite(rounded)) return null;
  const text = Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1);
  return `${text}%`;
}

/** Grouped games versus title ID reports. Playable games use the furthest report. */
export type EmulatorCoverage = {
  emulator: EmulatorId;
  games: number;
  playableGames: number;
  titleIds: number;
  playableTitleIds: number;
};

export function coverageFromGames(emulator: EmulatorId, games: Game[]): EmulatorCoverage {
  let withReports = 0;
  let playableGames = 0;
  let titleIds = 0;
  let playableTitleIds = 0;
  for (const game of games) {
    const reports = reportsOnEmulator(game, emulator);
    if (reports.length === 0) continue;
    withReports += 1;
    titleIds += reports.length;
    for (const report of reports) {
      if (report.status === "playable") playableTitleIds += 1;
    }
    if (bestStatus(reports.map((report) => report.status)) === "playable") playableGames += 1;
  }
  return { emulator, games: withReports, playableGames, titleIds, playableTitleIds };
}

export function emulatorCoverage(catalog: Catalog): EmulatorCoverage[] {
  return EMULATOR_IDS.map((emulator) => coverageFromGames(emulator, catalog.games));
}

export function platformHeadline(platform: Platform, total: number, playable: number): string {
  const label = PLATFORM_LABEL[platform];
  return `${playable.toLocaleString()} ${label} ${countWord(playable, "game has", "games have")} a Playable report in this snapshot, out of ${total.toLocaleString()} tracked ${label} ${countWord(total, "game", "games")}.`;
}

export function emulatorHeadline(emulator: EmulatorId, games: number, playable: number): string {
  const name = EMULATORS[emulator].name;
  if (games <= 0) return `No games have a ${name} report in this snapshot.`;
  const verb = playable === 1 ? "is" : "are";
  const percent = formatPlayablePercent(playable, games);
  const percentText = percent ? ` (${percent})` : "";
  return `${formatCount(playable)} of ${formatCount(games)} ${countWord(games, "game", "games")} ${verb} Playable on ${name} in this snapshot${percentText}.`;
}

export function titleIdSentence(coverage: EmulatorCoverage): string {
  const name = EMULATORS[coverage.emulator].name;
  if (coverage.titleIds <= 0) return `This snapshot has no ${name} title ID reports.`;
  const verb = coverage.playableTitleIds === 1 ? "is" : "are";
  return `${formatCount(coverage.playableTitleIds)} of ${formatCount(coverage.titleIds)} ${name} title ID ${countWord(coverage.titleIds, "report", "reports")} ${verb} Playable. A game can group several title IDs, such as a disc copy and a digital copy, and the game count uses the furthest ${name} report.`;
}

export function unitExplanation(coverage: EmulatorCoverage): string {
  return `${emulatorHeadline(coverage.emulator, coverage.games, coverage.playableGames)} ${titleIdSentence(coverage)}`;
}

export function statusHeadline(emulator: EmulatorId, status: Status, total: number): string {
  const name = EMULATORS[emulator].name;
  const label = STATUS_LABEL[status];
  return `${total.toLocaleString()} ${countWord(total, "game is", "games are")} ${label} on ${name} in this snapshot.`;
}

export function platformPath(platform: Platform): string {
  return `/${platform}`;
}

export function emulatorPath(emulator: EmulatorId): string {
  return `/emulators/${emulator}`;
}

export function emulatorStatusPath(emulator: EmulatorId, status: Status): string {
  return `/emulators/${emulator}/${status}`;
}

/** Page 1 keeps the existing status URL. Later pages add a numeric segment. */
export function emulatorStatusPagePath(emulator: EmulatorId, status: Status, page = 1): string {
  const base = emulatorStatusPath(emulator, status);
  if (page <= 1) return base;
  return `${base}/${page}`;
}

export function hubPageCount(total: number): number {
  if (total <= 0) return 1;
  return Math.ceil(total / HUB_PAGE_SIZE);
}

export function hubPageSlice<T>(items: T[], page: number): T[] {
  const start = (page - 1) * HUB_PAGE_SIZE;
  return items.slice(start, start + HUB_PAGE_SIZE);
}

/** Positive integers only. Leading zeros are rejected so `/01` is not a second page 1. */
export function parseHubPage(value: string): number | null {
  if (!/^[1-9]\d*$/.test(value)) return null;
  const page = Number(value);
  if (!Number.isSafeInteger(page) || page > 100000) return null;
  return page;
}

/** Status-list URLs after page 1, so every game can be linked from the sitemap. */
export function emulatorListingPaths(catalog: Catalog): string[] {
  const paths: string[] = [];
  for (const emulator of EMULATOR_IDS) {
    const games = gamesOnEmulator(catalog, emulator);
    const reportsOf = (game: Game) => reportsOnEmulator(game, emulator);
    for (const status of STATUSES) {
      const total = gamesWithBestStatus(games, reportsOf, status).length;
      const pages = hubPageCount(total);
      for (let page = 2; page <= pages; page += 1) {
        paths.push(emulatorStatusPagePath(emulator, status, page));
      }
    }
  }
  return paths;
}
