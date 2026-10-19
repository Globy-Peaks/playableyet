import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // Unknown game and project URLs must finish rendering before the status is
  // sent. Partial prefetching serves a 200 shell first, so notFound() cannot
  // change that first response to 404.
  partialPrefetching: false,
  allowedDevOrigins: ["127.0.0.1"],
  async rewrites() {
    return [{ source: "/search-index.json", destination: "/api/search-index" }];
  },
  async redirects() {
    return [
      { source: "/search", destination: "/", permanent: false },
      { source: "/rss", destination: "/feed.xml", permanent: true },
      { source: "/rss.xml", destination: "/feed.xml", permanent: true },
    ];
  },
  outputFileTracingIncludes: {
    "/": ["./data/catalog.json"],
    "/games/[slug]": ["./data/catalog.json"],
    "/sitemap.xml": ["./data/catalog.json"],
    "/api/watch": ["./data/catalog.json"],
    "/api/search-index": ["./data/catalog.json"],
    "/api/status": ["./data/catalog.json", "./data/sync-status.json"],
    "/api/cron/sync": ["./data/**/*"],
    "/ps3": ["./data/catalog.json"],
    "/ps4": ["./data/catalog.json"],
    "/ps5": ["./data/catalog.json"],
    "/emulators/[emulator]": ["./data/catalog.json"],
    "/emulators/[emulator]/[status]": ["./data/catalog.json"],
    "/changes": ["./data/catalog.json"],
    "/feed.xml": ["./data/catalog.json"],
    "/games/[slug]/opengraph-image": ["./data/catalog.json"],
    "/games/[slug]/twitter-image": ["./data/catalog.json"],
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
