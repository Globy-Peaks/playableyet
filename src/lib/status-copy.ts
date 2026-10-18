import { STATUS_LABEL } from "@/lib/status";
import { STATUSES, type EmulatorId, type Status } from "@/lib/types";

/**
 * Short meanings copied from each project's own compatibility page or status guide.
 * A missing entry means that project does not publish a definition for that label.
 */
const GLOSS: Partial<Record<EmulatorId, Partial<Record<Status, string>>>> = {
  rpcs3: {
    playable: "can be completed with playable performance and no game breaking glitches",
    ingame: "cannot be finished, has serious glitches, or has insufficient performance",
    intro: "displays an image but does not get past the menus",
    loadable: "displays a black screen with a framerate in the window title",
    nothing: "does not initialize, does not load, or crashes the emulator",
  },
  shadps4: {
    playable: "can be played without any major issue",
    ingame: "reaches gameplay but has game-breaking issues",
    menus: "reaches the menu but freezes or crashes before going further",
    boots: "shows visual or audio output but freezes or crashes before the menu",
    nothing: "crashes when trying to launch or hangs on a black screen",
  },
  fpps4: {
    playable: "boots and plays without crashes or GPU bugs, at a speed that is reasonable on an average PC",
    ingame: "goes in-game but crashes, deadlocks, has GPU or audio bugs, or is too slow",
    menus: "gets past the title screen but not into main gameplay",
    boots: "boots but does not get past the title screen",
    nothing: "does not boot and shows no signs of life",
  },
  sharpemu: {
    playable: "completable with minor or no issues",
    ingame: "reaches gameplay with major issues",
    menus: "reaches interactive menus",
    boots: "shows splash or intro output and goes no further",
    nothing: "crashes or shows no output",
  },
  kytyps5: {
    nothing: "does not show its first logo or startup screen",
    boots: "shows a logo or startup screen but does not reach the main menu",
    menus: "reaches its menus but does not enter gameplay",
    ingame: "reaches controllable gameplay, even if bugs prevent completion",
  },
  anyps5: {
    playable: "officially confirmed by the AnyPS5 project, which says conversion does not guarantee that an app runs",
    "in-bring-up": "a community roadmap stage, not an official Playable confirmation from the AnyPS5 project",
  },
};

export function statusGloss(emulator: EmulatorId, status: Status): string | null {
  return GLOSS[emulator]?.[status] ?? null;
}

export function statusPhrase(emulator: EmulatorId, status: Status): string {
  const label = STATUS_LABEL[status];
  const gloss = statusGloss(emulator, status);
  return gloss ? `${label} (${gloss})` : label;
}

export function documentedStatuses(emulator: EmulatorId): { status: Status; label: string; gloss: string }[] {
  return STATUSES.flatMap((status) => {
    const gloss = statusGloss(emulator, status);
    if (!gloss) return [];
    return [{ status, label: STATUS_LABEL[status], gloss }];
  });
}
