import { loadCatalog } from "@/lib/catalog";
import { rssXml } from "@/lib/changes-feed";
import { statusChanges } from "@/lib/feeds";
import { siteUrl } from "@/lib/site";

export async function GET() {
  const catalog = await loadCatalog();
  const xml = rssXml(statusChanges(catalog), siteUrl(), catalog.generatedAt);
  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}
