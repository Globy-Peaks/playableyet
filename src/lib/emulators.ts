import type { EmulatorId, Platform } from "@/lib/types";

export type EmulatorInfo = {
  id: EmulatorId;
  name: string;
  platform: Platform;
  kind: "emulator" | "porting-layer";
  kindLabel: string;
  projectUrl: string;
  siteUrl: string;
  summary: string;
};

export const EMULATORS: Record<EmulatorId, EmulatorInfo> = {
  rpcs3: {
    id: "rpcs3",
    name: "RPCS3",
    platform: "ps3",
    kind: "emulator",
    kindLabel: "PS3 emulator",
    projectUrl: "https://github.com/RPCS3/rpcs3",
    siteUrl: "https://rpcs3.net/compatibility",
    summary: "PlayStation 3 emulator. Statuses come from the public compatibility list.",
  },
  shadps4: {
    id: "shadps4",
    name: "shadPS4",
    platform: "ps4",
    kind: "emulator",
    kindLabel: "PS4 emulator",
    projectUrl: "https://github.com/shadps4-emu/shadPS4",
    siteUrl: "https://shadps4.net/compatibility/",
    summary: "PlayStation 4 emulator. Reports are GitHub issues with status labels.",
  },
  fpps4: {
    id: "fpps4",
    name: "fpPS4",
    platform: "ps4",
    kind: "emulator",
    kindLabel: "PS4 emulator",
    projectUrl: "https://github.com/red-prig/fpPS4",
    siteUrl: "https://fpps4.net/compatibility/",
    summary: "PlayStation 4 emulator. The public list is built from GitHub issues.",
  },
  sharpemu: {
    id: "sharpemu",
    name: "SharpEmu",
    platform: "ps5",
    kind: "emulator",
    kindLabel: "PS5 emulator",
    projectUrl: "https://github.com/sharpemu/sharpemu-site",
    siteUrl: "https://sharpemu.app/compatibility/",
    summary: "PlayStation 5 emulator. Tested titles are markdown compatibility reports.",
  },
  kytyps5: {
    id: "kytyps5",
    name: "KytyPS5",
    platform: "ps5",
    kind: "emulator",
    kindLabel: "PS5 emulator",
    projectUrl: "https://github.com/KytyPS5/KytyPS5",
    siteUrl: "https://kytyps5.github.io/",
    summary: "PlayStation 5 emulator. Community game-status issues live in the project repository.",
  },
  anyps5: {
    id: "anyps5",
    name: "AnyPS5",
    platform: "ps5",
    kind: "porting-layer",
    kindLabel: "PS5 to native porting layer",
    projectUrl: "https://github.com/boykopovar/AnyPS5",
    siteUrl: "https://boykopovar.github.io/AnyPS5/",
    summary:
      "A PS5 to native porting layer, not an emulator. Playable is reserved for officially confirmed titles.",
  },
};

export const PLATFORM_LABEL: Record<Platform, string> = {
  ps3: "PlayStation 3",
  ps4: "PlayStation 4",
  ps5: "PlayStation 5",
};

export function emulatorPlatform(id: EmulatorId): Platform {
  return EMULATORS[id].platform;
}
