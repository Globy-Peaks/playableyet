import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      other: {
        "# llms.txt": `${base}/llms.txt`,
        "# llms-full.txt": `${base}/llms-full.txt`,
      },
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
