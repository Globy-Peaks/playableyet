import { emulatorPlatform } from "@/lib/emulators";
import { normalizeName } from "@/lib/identity";
import { STATUS_RANK, bestStatus } from "@/lib/status";
import type { Game, Platform } from "@/lib/types";

const STOP = new Set(["the", "a", "an", "of", "and", "for", "to"]);

export function nameStem(name: string): string {
  const words = normalizeName(name)
    .split(" ")
    .filter((word) => word && !STOP.has(word));
  if (words.length === 0) return "";
  const stem = words[0].length >= 5 || words.length === 1 ? words[0] : `${words[0]} ${words[1]}`;
  return stem.length >= 4 ? stem : "";
}

export function primaryPlatform(game: Game): Platform {
  let best: { platform: Platform; rank: number } | null = null;
  for (const report of game.reports) {
    const platform = emulatorPlatform(report.emulator);
    const rank = STATUS_RANK[report.status];
    if (!best || rank > best.rank) best = { platform, rank };
  }
  return best?.platform ?? game.titles[0]?.platform ?? "ps3";
}

export function relatedGames(games: Game[], game: Game, limit = 6): Game[] {
  const stem = nameStem(game.name);
  const platforms = new Set(game.titles.map((title) => title.platform));
  for (const report of game.reports) platforms.add(emulatorPlatform(report.emulator));
  const own = bestStatus(game.reports.map((report) => report.status));
  const ownEmulators = new Set(game.reports.map((report) => report.emulator));
  const ranked: { game: Game; score: number }[] = [];

  for (const other of games) {
    if (other.slug === game.slug) continue;
    let score = 0;
    const otherStem = nameStem(other.name);
    if (stem && otherStem === stem) score += 5;
    const sharesPlatform = other.titles.some((title) => platforms.has(title.platform));
    const otherBest = bestStatus(other.reports.map((report) => report.status));
    const close =
      own && otherBest ? Math.abs(STATUS_RANK[otherBest] - STATUS_RANK[own]) <= 10 : false;
    if (sharesPlatform && close) {
      score += other.reports.some((report) => ownEmulators.has(report.emulator)) ? 3 : 1;
    }
    if (score === 0) continue;
    ranked.push({ game: other, score });
  }

  ranked.sort((a, b) => b.score - a.score || a.game.name.localeCompare(b.game.name) || a.game.slug.localeCompare(b.game.slug));
  return ranked.slice(0, limit).map((item) => item.game);
}
