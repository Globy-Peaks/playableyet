import { cacheLife, cacheTag } from "next/cache";
import { EMPTY_CATALOG, readCatalogBlob, readCatalogFile } from "@/lib/catalog-store";
import { CATALOG_CACHE_TAG } from "@/lib/catalog-tag";
import type { Catalog, Game } from "@/lib/types";

export async function loadCatalog(): Promise<Catalog> {
  "use cache";
  cacheLife("hours");
  cacheTag(CATALOG_CACHE_TAG);
  const fromBlob = await readCatalogBlob();
  return fromBlob ?? readCatalogFile() ?? EMPTY_CATALOG;
}

export async function loadGame(slug: string): Promise<Game | null> {
  const catalog = await loadCatalog();
  return catalog.games.find((game) => game.slug === slug) ?? null;
}
