import { EMULATORS } from "@/lib/emulators";
import type { FaqEntry } from "@/lib/game-faq";
import { emulatorHeadline, titleIdSentence, type EmulatorCoverage } from "@/lib/hubs";
import { statusGloss } from "@/lib/status-copy";

const PLATFORM_SHORT = {
  ps3: "PS3",
  ps4: "PS4",
  ps5: "PS5",
} as const;

/** Plain-language counts for one project. Both units come from the snapshot. */
export function emulatorFaq(coverage: EmulatorCoverage): FaqEntry[] {
  const info = EMULATORS[coverage.emulator];
  const short = PLATFORM_SHORT[info.platform];
  return [
    {
      question: `How many ${short} games are playable on ${info.name}?`,
      answer: faqAnswer(coverage),
    },
  ];
}

function faqAnswer(coverage: EmulatorCoverage): string {
  const info = EMULATORS[coverage.emulator];
  const parts = [emulatorHeadline(coverage.emulator, coverage.games, coverage.playableGames), titleIdSentence(coverage)];
  if (info.kind === "porting-layer") {
    parts.unshift(`${info.name} is a porting layer, not an emulator.`);
  } else if (coverage.games > 0 && !statusGloss(coverage.emulator, "playable")) {
    parts.push(`${info.name} does not publish a Playable definition. A report is counted when it uses that word.`);
  } else if (coverage.playableGames > 0) {
    parts.push(`Playable is ${info.name}'s compatibility status. It is not a claim that every setup can finish the game.`);
  }
  parts.push("These counts come from this snapshot. They are not copied from a project announcement.");
  return parts.join(" ");
}
