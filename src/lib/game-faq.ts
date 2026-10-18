import { EMULATORS } from "@/lib/emulators";
import { STATUS_RANK, bestStatus } from "@/lib/status";
import { statusPhrase } from "@/lib/status-copy";
import type { EmulatorId, Game, Status } from "@/lib/types";

export type FaqEntry = { question: string; answer: string };

export function gameFaq(game: Game): FaqEntry[] {
  return [
    { question: `Is ${game.name} playable on PC?`, answer: playableOnPc(game) },
    { question: `Which emulator runs ${game.name} best?`, answer: bestProject(game) },
  ];
}

function playableOnPc(game: Game): string {
  if (game.reports.length === 0) {
    return `This snapshot has no public compatibility report for ${game.name}.`;
  }
  const playable = uniqueProjects(game, (status) => status === "playable");
  if (playable.length > 0) {
    return `In this snapshot, ${game.name} is marked Playable on ${join(playable.map(projectName))}. Playable is that project's compatibility status. It is not a claim that every PC setup can finish the game.`;
  }
  const furthest = furthestProjects(game);
  return `In this snapshot, no tracked project marks ${game.name} as Playable. The furthest status is ${join(
    furthest.map((item) => `${projectName(item.emulator)} ${statusPhrase(item.emulator, item.status)}`),
  )}.`;
}

function bestProject(game: Game): string {
  const emulators = game.reports.filter((report) => EMULATORS[report.emulator].kind === "emulator");
  const porting = game.reports.filter((report) => EMULATORS[report.emulator].kind === "porting-layer");
  const parts: string[] = [];
  if (emulators.length === 0) {
    parts.push(`No emulator in this snapshot has a report for ${game.name}.`);
  } else {
    const best = furthestOf(emulators.map((report) => report.emulator), game);
    parts.push(
      `The furthest emulator status in this snapshot is ${join(
        best.map((item) => `${projectName(item.emulator)} ${statusPhrase(item.emulator, item.status)}`),
      )}. Furthest means the highest status on the shared ladder, not a measured performance ranking.`,
    );
  }
  if (porting.length > 0) {
    const best = furthestOf(porting.map((report) => report.emulator), game);
    parts.push(
      `${join(best.map((item) => projectName(item.emulator)))} is a porting layer, not an emulator. Its furthest report in this snapshot is ${join(
        best.map((item) => statusPhrase(item.emulator, item.status)),
      )}.`,
    );
  }
  return parts.join(" ");
}

function furthestProjects(game: Game): { emulator: EmulatorId; status: Status }[] {
  return furthestOf(
    game.reports.map((report) => report.emulator),
    game,
  );
}

function furthestOf(ids: EmulatorId[], game: Game): { emulator: EmulatorId; status: Status }[] {
  const unique = [...new Set(ids)];
  const ranked = unique.flatMap((emulator) => {
    const status = bestStatus(game.reports.filter((report) => report.emulator === emulator).map((report) => report.status));
    return status ? [{ emulator, status }] : [];
  });
  const top = ranked.reduce((best, item) => Math.max(best, STATUS_RANK[item.status]), 0);
  return ranked
    .filter((item) => STATUS_RANK[item.status] === top)
    .sort((a, b) => projectName(a.emulator).localeCompare(projectName(b.emulator)));
}

function uniqueProjects(game: Game, include: (status: Status) => boolean): EmulatorId[] {
  return [...new Set(game.reports.filter((report) => include(report.status)).map((report) => report.emulator))].sort(
    (a, b) => projectName(a).localeCompare(projectName(b)),
  );
}

function projectName(id: EmulatorId): string {
  return EMULATORS[id].name;
}

export function faqPageJsonLd(entries: FaqEntry[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: entries.map((entry) => ({
      "@type": "Question",
      name: entry.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: entry.answer,
      },
    })),
  };
}

function join(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items.at(-1)}`;
}
