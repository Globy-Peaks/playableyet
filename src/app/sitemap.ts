import type { MetadataRoute } from "next";
import { loadCatalog } from "@/lib/catalog";
import { emulatorPath, emulatorStatusPath, platformPath } from "@/lib/hubs";
import { siteUrl } from "@/lib/site";
import { EMULATOR_IDS, PLATFORMS, STATUSES } from "@/lib/types";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const catalog = await loadCatalog();
  const base = siteUrl();
  const updated = catalog.generatedAt;
  return [
    { url: `${base}/`, lastModified: updated, changeFrequency: "daily", priority: 1 },
    { url: `${base}/about`, lastModified: updated, changeFrequency: "monthly", priority: 0.4 },
    { url: `${base}/changes`, lastModified: updated, changeFrequency: "daily", priority: 0.6 },
    { url: `${base}/feed.xml`, lastModified: updated, changeFrequency: "daily", priority: 0.4 },
    ...PLATFORMS.map((platform) => ({
      url: `${base}${platformPath(platform)}`,
      lastModified: updated,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    ...EMULATOR_IDS.map((emulator) => ({
      url: `${base}${emulatorPath(emulator)}`,
      lastModified: updated,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
    ...EMULATOR_IDS.flatMap((emulator) =>
      STATUSES.map((status) => ({
        url: `${base}${emulatorStatusPath(emulator, status)}`,
        lastModified: updated,
        changeFrequency: "daily" as const,
        priority: 0.5,
      })),
    ),
    { url: `${base}/llms.txt`, lastModified: updated, changeFrequency: "monthly", priority: 0.2 },
    { url: `${base}/llms-full.txt`, lastModified: updated, changeFrequency: "monthly", priority: 0.2 },
    ...catalog.games.map((game) => ({
      url: `${base}/games/${game.slug}`,
      lastModified: updated,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
