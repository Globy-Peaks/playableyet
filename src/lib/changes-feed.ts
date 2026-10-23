import type { FeedItem } from "@/lib/feeds";
import { EMULATORS } from "@/lib/emulators";
import { STATUS_LABEL } from "@/lib/status";
import { formatEditionList } from "@/lib/title-edition";

export const CHANGES_PAGE_SIZE = 100;

export function rssXml(items: FeedItem[], origin: string, generatedAt: string): string {
  const shown = items.slice(0, CHANGES_PAGE_SIZE);
  const channel = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<rss version="2.0">`,
    `<channel>`,
    `<title>PlayableYet status changes</title>`,
    `<link>${escapeXml(`${origin}/changes`)}</link>`,
    `<description>Status changes recorded between PlayableYet snapshots. The first time a report is seen is not a change.</description>`,
    `<lastBuildDate>${rfc822(generatedAt)}</lastBuildDate>`,
    ...shown.map((item) => itemXml(item, origin, generatedAt)),
    `</channel>`,
    `</rss>`,
  ];
  return channel.join("");
}

function itemXml(item: FeedItem, origin: string, generatedAt: string): string {
  const from = item.from ? STATUS_LABEL[item.from] : "previous";
  const title = `${item.name}: ${from} to ${STATUS_LABEL[item.status]} on ${EMULATORS[item.emulator].name}`;
  const editions = formatEditionList(item.editions);
  const description = editions ? `${title}. Editions: ${editions}.` : title;
  const ids = item.editions.map((edition) => edition.id).join(",");
  const link = `${origin}/games/${item.slug}`;
  return [
    `<item>`,
    `<title>${escapeXml(title)}</title>`,
    `<link>${escapeXml(link)}</link>`,
    `<guid isPermaLink="false">${escapeXml(`${item.slug}:${item.emulator}:${ids}:${item.at}:${item.from ?? ""}:${item.status}`)}</guid>`,
    `<pubDate>${rfc822(item.at, generatedAt)}</pubDate>`,
    `<description>${escapeXml(description)}</description>`,
    `</item>`,
  ].join("");
}

export function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function rfc822(value: string, ceiling?: string): string {
  const cap = ceiling ? new Date(ceiling) : undefined;
  const capTime = cap && !Number.isNaN(cap.getTime()) ? cap : undefined;
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  let date: Date;
  if (!dateOnly) date = new Date(value);
  else if (capTime && ceiling?.slice(0, 10) === value) date = capTime;
  else date = new Date(`${value}T12:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return new Date(0).toUTCString();
  if (capTime && date.getTime() > capTime.getTime()) date = capTime;
  return date.toUTCString();
}
