import type { MetadataRoute } from "next";
import { loadCatalog } from "@/lib/catalog";
import { siteUrl } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const catalog = await loadCatalog();
  const base = siteUrl();
  const updated = catalog.generatedAt;
  return [
    { url: `${base}/`, lastModified: updated, changeFrequency: "daily", priority: 1 },
    { url: `${base}/about`, lastModified: updated, changeFrequency: "monthly", priority: 0.4 },
    ...catalog.games.map((game) => ({
      url: `${base}/games/${game.slug}`,
      lastModified: updated,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
