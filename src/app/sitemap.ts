import type { MetadataRoute } from "next";
import { cacheLife, cacheTag } from "next/cache";
import { connection } from "next/server";
import { loadCatalog } from "@/lib/catalog";
import { CATALOG_CACHE_TAG } from "@/lib/catalog-tag";
import { emulatorPath, emulatorStatusPath, platformPath } from "@/lib/hubs";
import { gameLastModified } from "@/lib/sitemap-dates";
import { siteUrl } from "@/lib/site";
import { EMULATOR_IDS, PLATFORMS, STATUSES } from "@/lib/types";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // A build must not freeze lastmod on the snapshot that existed at deploy time.
  // The cached helper is what skips the Blob read on later requests.
  await connection();
  return cachedSitemap(siteUrl());
}

async function cachedSitemap(origin: string): Promise<MetadataRoute.Sitemap> {
  "use cache: remote";
  // The 06:15 UTC sync expires CATALOG_CACHE_TAG. Days is the fallback when that sync does not publish.
  cacheLife("days");
  cacheTag(CATALOG_CACHE_TAG);
  const catalog = await loadCatalog();
  const updated = catalog.generatedAt;
  return [
    { url: `${origin}/`, lastModified: updated, changeFrequency: "daily", priority: 1 },
    { url: `${origin}/about`, lastModified: updated, changeFrequency: "monthly", priority: 0.4 },
    { url: `${origin}/sponsor`, lastModified: updated, changeFrequency: "monthly", priority: 0.3 },
    { url: `${origin}/changes`, lastModified: updated, changeFrequency: "daily", priority: 0.6 },
    { url: `${origin}/feed.xml`, lastModified: updated, changeFrequency: "daily", priority: 0.4 },
    ...PLATFORMS.map((platform) => ({
      url: `${origin}${platformPath(platform)}`,
      lastModified: updated,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    ...EMULATOR_IDS.map((emulator) => ({
      url: `${origin}${emulatorPath(emulator)}`,
      lastModified: updated,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
    ...EMULATOR_IDS.flatMap((emulator) =>
      STATUSES.map((status) => ({
        url: `${origin}${emulatorStatusPath(emulator, status)}`,
        lastModified: updated,
        changeFrequency: "daily" as const,
        priority: 0.5,
      })),
    ),
    { url: `${origin}/llms.txt`, lastModified: updated, changeFrequency: "monthly", priority: 0.2 },
    { url: `${origin}/llms-full.txt`, lastModified: updated, changeFrequency: "monthly", priority: 0.2 },
    ...catalog.games.map((game) => ({
      url: `${origin}/games/${game.slug}`,
      lastModified: gameLastModified(game.history, updated),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
