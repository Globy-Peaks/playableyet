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

export function platformHeadline(platform: Platform, total: number, playable: number): string {
  const label = PLATFORM_LABEL[platform];
  return `${playable.toLocaleString()} ${label} ${countWord(playable, "game has", "games have")} a Playable report in this snapshot, out of ${total.toLocaleString()} tracked ${label} ${countWord(total, "game", "games")}.`;
}

export function emulatorHeadline(emulator: EmulatorId, total: number, playable: number): string {
  const name = EMULATORS[emulator].name;
  return `${playable.toLocaleString()} ${countWord(playable, "game has", "games have")} a Playable ${name} report in this snapshot, out of ${total.toLocaleString()} ${countWord(total, "game", "games")} with a ${name} report.`;
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
