import type { Status } from "@/lib/types";

/** Higher rank is further along. */
export const STATUS_RANK: Record<Status, number> = {
  playable: 80,
  ingame: 70,
  intro: 60,
  menus: 55,
  loadable: 40,
  boots: 30,
  "in-bring-up": 20,
  nothing: 10,
};

export const STATUS_LABEL: Record<Status, string> = {
  playable: "Playable",
  ingame: "Ingame",
  intro: "Intro",
  menus: "Menus",
  loadable: "Loadable",
  boots: "Boots",
  "in-bring-up": "In bring-up",
  nothing: "Nothing",
};

export const STATUS_DETAIL: Record<Status, string> = {
  playable: "Can be played through, with minor or no issues.",
  ingame: "Reaches gameplay, with serious glitches or performance problems.",
  intro: "Shows image or an intro and does not get through the menus.",
  menus: "Reaches interactive menus and does not reach gameplay.",
  loadable: "Loads far enough to show a black screen or a framerate, then stops.",
  boots: "Shows a splash, logo, or other early output, then stops.",
  "in-bring-up": "Tracked while the project is bringing the title up. Not a playable rating.",
  nothing: "Crashes or shows nothing useful.",
};

export function bestStatus(statuses: Status[]): Status | null {
  let best: Status | null = null;
  for (const status of statuses) {
    if (!best || STATUS_RANK[status] > STATUS_RANK[best]) best = status;
  }
  return best;
}

export function mapLooseStatus(input: string | undefined | null): Status | null {
  if (!input) return null;
  const text = input.toLowerCase().replace(/[_]+/g, " ").replace(/\s+/g, " ").trim();
  if (!text || text === "no response" || text === "_no response_") return null;
  if (
    /does\s*n.?t boot|does not boot|won'?t boot|will not boot|nothing|black screen|no boot/.test(
      text,
    )
  ) {
    return "nothing";
  }
  if (/\bplayable\b|\bperfect\b/.test(text)) return "playable";
  if (/in[\s-]?game|\bgameplay\b/.test(text)) return "ingame";
  if (/\bintro\b/.test(text)) return "intro";
  if (/main menu|\bmenus?\b/.test(text)) return "menus";
  if (/\bloadable\b|\bloads?\b/.test(text)) return "loadable";
  if (/\blogo\b|\bsplash\b|\bboots?\b|\bstarts?\b/.test(text)) return "boots";
  if (/bring[- ]?up|in progress/.test(text)) return "in-bring-up";
  return null;
}

export function statusFromLabels(labels: string[]): Status | null {
  const found: Status[] = [];
  for (const label of labels) {
    const name = label.toLowerCase();
    if (!name.startsWith("status-")) continue;
    const mapped = mapLooseStatus(name.slice("status-".length));
    if (mapped) found.push(mapped);
  }
  return bestStatus(found);
}

export function osFromLabels(labels: string[]): string[] {
  const os = new Set<string>();
  for (const label of labels) {
    const name = label.toLowerCase();
    if (!name.startsWith("os-")) continue;
    const value = name.slice(3);
    if (value === "mac" || value === "macos" || value === "osx") os.add("macos");
    else if (value === "windows" || value === "win") os.add("windows");
    else if (value === "linux") os.add("linux");
    else if (value) os.add(value);
  }
  return [...os].sort();
}

export function toDay(input: string | undefined | null): string {
  if (!input) return "1970-01-01";
  const trimmed = input.trim();
  const direct = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (direct) return `${direct[1]}-${direct[2]}-${direct[3]}`;
  const slash = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slash) {
    const day = slash[1].padStart(2, "0");
    const month = slash[2].padStart(2, "0");
    return `${slash[3]}-${month}-${day}`;
  }
  const parsed = Date.parse(trimmed);
  if (Number.isNaN(parsed)) return "1970-01-01";
  return new Date(parsed).toISOString().slice(0, 10);
}

export function daysBetween(laterIso: string, earlierDay: string): number | null {
  const later = Date.parse(laterIso);
  const earlier = Date.parse(
    earlierDay.length === 10 ? `${earlierDay}T00:00:00.000Z` : earlierDay,
  );
  if (Number.isNaN(later) || Number.isNaN(earlier)) return null;
  return (later - earlier) / 86_400_000;
}
