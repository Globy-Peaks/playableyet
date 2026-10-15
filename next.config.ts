import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  allowedDevOrigins: ["127.0.0.1"],
  outputFileTracingIncludes: {
    "/": ["./data/catalog.json"],
    "/games/[slug]": ["./data/catalog.json"],
    "/sitemap.xml": ["./data/catalog.json"],
    "/api/watch": ["./data/catalog.json"],
    "/api/cron/sync": ["./data/**/*"],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
