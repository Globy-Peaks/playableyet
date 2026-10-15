import type { EmulatorId, Platform } from "@/lib/types";
import { emulatorPlatform } from "@/lib/emulators";

const TITLE_ID = /\b([A-Z]{4}\d{5})\b/i;

export function isTitleId(value: string): boolean {
  return /^[A-Z]{4}\d{5}$/.test(value);
}

export function platformFor(titleId: string, emulator: EmulatorId): Platform {
  if (titleId.startsWith("PPSA")) return "ps5";
  if (/^(CUSA|PC[A-Z]{2}|PL[A-Z]{2}|V[CL][A-Z]{2})/.test(titleId)) return "ps4";
  return emulatorPlatform(emulator);
}

export function normalizeName(name: string): string {
  const stripped = name
    .replace(/[\u2122\u00AE\u00A9]/g, "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\((?:usa|eur|europe|jpn|japan|asia|kr|au|uk|english|disc|digital|psn)\)/g, " ")
    .replace(/[‘’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return stripped;
}

export function slugifyName(name: string): string {
  const slug = normalizeName(name).replace(/\s+/g, "-").replace(/^-+|-+$/g, "");
  return slug || "untitled";
}

export function cleanDisplayName(name: string): string {
  return name
    .replace(/[\u2122\u00AE\u00A9]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function splitTitleAndId(input: string): { titleId?: string; name?: string } {
  const match = input.match(TITLE_ID);
  if (!match || match.index === undefined) {
    const name = input.replace(/\s+/g, " ").trim();
    return { name: name || undefined };
  }
  const titleId = match[1].toUpperCase();
  const name = input
    .replace(/[\u2122\u00AE\u00A9]/g, "")
    .replace(match[0], " ")
    .replace(/[()[\]{}]/g, " ")
    .replace(/\s*[-–—:|/]+\s*/g, " ")
    .replace(/\b(v|ver|version)\s*\d+(\.\d+)*\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return { titleId, name: name || undefined };
}

export function extractTitleId(input: string): string | undefined {
  const match = input.toUpperCase().match(/\b([A-Z]{4}\d{5})\b/);
  return match?.[1];
}

const REGION_RANK: Record<string, number> = {
  UP: 0,
  US: 1,
  EP: 2,
  JP: 3,
};

export function regionRank(region: string | undefined): number {
  if (!region) return 9;
  return REGION_RANK[region.toUpperCase()] ?? 6;
}

export function isUsefulTitle(name: string): boolean {
  const text = name.trim();
  if (text.length < 2) return false;
  return !/\bentitlement\b|\bavatar\b|\bsoundtrack\b|\btheme\b|\bpsvr\b/i.test(text);
}

export class UnionFind {
  private parent = new Map<string, string>();

  add(id: string) {
    if (!this.parent.has(id)) this.parent.set(id, id);
  }

  has(id: string) {
    return this.parent.has(id);
  }

  find(id: string): string {
    this.add(id);
    let current = id;
    while (this.parent.get(current) !== current) {
      const next = this.parent.get(current)!;
      const parent = this.parent.get(next)!;
      this.parent.set(current, parent);
      current = parent;
    }
    return current;
  }

  union(a: string, b: string) {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent.set(ra, rb);
  }
}
