import bannerFile from "../../data/sponsor-banner.json";
import supportersFile from "../../data/supporters.json";

export type BannerSponsor = {
  name: string;
  href: string;
  message: string;
};

export type Supporter = {
  name: string;
};

const NAME_LIMIT = 80;
const MESSAGE_LIMIT = 180;

/** https only. Rejects javascript:, data:, and URLs with embedded credentials. */
export function sponsorHttpsUrl(input: string): string | null {
  try {
    const url = new URL(input.trim());
    if (url.protocol !== "https:") return null;
    if (url.username || url.password) return null;
    if (!url.hostname || url.hostname === "localhost" || !url.hostname.includes(".")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function activeBanner(value: unknown): BannerSponsor | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const name = typeof row.name === "string" ? row.name.trim() : "";
  const message = typeof row.message === "string" ? row.message.trim() : "";
  const href = typeof row.href === "string" ? sponsorHttpsUrl(row.href) : null;
  if (!name || !message || !href) return null;
  if (name.length > NAME_LIMIT || message.length > MESSAGE_LIMIT) return null;
  return { name, href, message };
}

export function readSupporters(value: unknown): Supporter[] {
  if (!Array.isArray(value)) return [];
  const names: Supporter[] = [];
  for (const item of value) {
    const raw = typeof item === "string" ? item : item && typeof item === "object" && "name" in item ? item.name : "";
    const name = typeof raw === "string" ? raw.trim() : "";
    if (!name || name.length > NAME_LIMIT) continue;
    if (names.some((entry) => entry.name.toLowerCase() === name.toLowerCase())) continue;
    names.push({ name });
  }
  return names;
}

export function currentBanner(): BannerSponsor | null {
  return activeBanner(bannerFile);
}

export function currentSupporters(): Supporter[] {
  return readSupporters(supportersFile);
}
