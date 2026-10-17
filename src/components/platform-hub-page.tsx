import type { Metadata } from "next";
import { CatalogHub } from "@/components/catalog-hub";
import { loadCatalog } from "@/lib/catalog";
import { PLATFORM_LABEL } from "@/lib/emulators";
import {
  HUB_PAGE_SIZE,
  countByBestStatus,
  gamesOnPlatform,
  hubRows,
  platformHeadline,
  platformPath,
  rankHubGames,
  reportsInPlatform,
} from "@/lib/hubs";
import type { Platform } from "@/lib/types";

async function platformView(platform: Platform) {
  const catalog = await loadCatalog();
  const games = gamesOnPlatform(catalog, platform);
  const reportsOf = (game: (typeof games)[number]) => reportsInPlatform(game, platform);
  const counts = countByBestStatus(games, reportsOf);
  const playable = counts.find((item) => item.status === "playable")?.games ?? 0;
  const ranked = rankHubGames(games, reportsOf);
  return {
    h1: platformHeadline(platform, games.length, playable),
    counts: counts.map((count) => ({
      ...count,
      href: `/?platform=${platform}&status=${count.status}`,
    })),
    rows: hubRows(ranked.slice(0, HUB_PAGE_SIZE), reportsOf),
    total: games.length,
  };
}

export async function platformHubMetadata(platform: Platform): Promise<Metadata> {
  const view = await platformView(platform);
  const label = PLATFORM_LABEL[platform];
  const title = `${label} compatibility`;
  return {
    title,
    description: view.h1,
    alternates: { canonical: platformPath(platform) },
    openGraph: { title, description: view.h1, url: platformPath(platform) },
  };
}

export async function PlatformHubPage({ platform }: { platform: Platform }) {
  const view = await platformView(platform);
  return (
    <CatalogHub
      crumbs={[{ name: "Games", href: "/" }]}
      pageName={PLATFORM_LABEL[platform]}
      pageHref={platformPath(platform)}
      h1={view.h1}
      description={`Counts use the furthest ${PLATFORM_LABEL[platform]} report on each game. The list shows the first ${HUB_PAGE_SIZE.toLocaleString()} games in that order.`}
      counts={view.counts}
      rows={view.rows}
      total={view.total}
      moreHref={`/?platform=${platform}`}
    />
  );
}
