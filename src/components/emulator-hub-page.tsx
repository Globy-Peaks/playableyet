import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CatalogHub } from "@/components/catalog-hub";
import { loadCatalog } from "@/lib/catalog";
import { EMULATORS, PLATFORM_LABEL } from "@/lib/emulators";
import {
  HUB_PAGE_SIZE,
  countByBestStatus,
  emulatorHeadline,
  emulatorPath,
  emulatorStatusPath,
  gamesOnEmulator,
  gamesWithBestStatus,
  hubRows,
  isEmulatorId,
  isStatusId,
  platformPath,
  rankHubGames,
  reportsOnEmulator,
  statusHeadline,
} from "@/lib/hubs";
import { STATUS_LABEL } from "@/lib/status";
import type { EmulatorId, Status } from "@/lib/types";

async function emulatorView(emulator: EmulatorId, status?: Status) {
  const catalog = await loadCatalog();
  const info = EMULATORS[emulator];
  const games = gamesOnEmulator(catalog, emulator);
  const reportsOf = (game: (typeof games)[number]) => reportsOnEmulator(game, emulator);
  const counts = countByBestStatus(games, reportsOf);
  const playable = counts.find((item) => item.status === "playable")?.games ?? 0;
  const matched = status ? gamesWithBestStatus(games, reportsOf, status) : games;
  const ranked = status ? [...matched].sort((a, b) => a.name.localeCompare(b.name)) : rankHubGames(matched, reportsOf);
  const h1 = status ? statusHeadline(emulator, status, matched.length) : emulatorHeadline(emulator, games.length, playable);
  return { info, counts, h1, rows: hubRows(ranked.slice(0, HUB_PAGE_SIZE), reportsOf), total: matched.length };
}

export async function emulatorHubMetadata(emulator: string, status?: string): Promise<Metadata> {
  if (!isEmulatorId(emulator) || (status !== undefined && !isStatusId(status))) notFound();
  const view = await emulatorView(emulator, status);
  const title = status && isStatusId(status) ? `${STATUS_LABEL[status]} games on ${view.info.name}` : `${view.info.name} compatibility`;
  const path = status && isStatusId(status) ? emulatorStatusPath(emulator, status) : emulatorPath(emulator);
  return {
    title,
    description: view.h1,
    alternates: { canonical: path },
    openGraph: { title, description: view.h1, url: path },
  };
}

export async function EmulatorHubPage({ emulator, status }: { emulator: string; status?: string }) {
  if (!isEmulatorId(emulator)) notFound();
  if (status !== undefined && !isStatusId(status)) notFound();
  const view = await emulatorView(emulator, status);
  const path = status ? emulatorStatusPath(emulator, status) : emulatorPath(emulator);
  const pageName = status ? `${STATUS_LABEL[status]} on ${view.info.name}` : view.info.name;
  return (
    <CatalogHub
      crumbs={[
        { name: "Games", href: "/" },
        { name: PLATFORM_LABEL[view.info.platform], href: platformPath(view.info.platform) },
        ...(status ? [{ name: view.info.name, href: emulatorPath(emulator) }] : []),
      ]}
      pageName={pageName}
      pageHref={path}
      h1={view.h1}
      description={`${view.info.summary} Counts use the furthest ${view.info.name} report on each game. The list shows the first ${HUB_PAGE_SIZE.toLocaleString()} games.`}
      counts={view.counts.map((count) => ({
        ...count,
        href: emulatorStatusPath(emulator, count.status),
      }))}
      rows={view.rows}
      total={view.total}
      moreHref={status ? `/?emulator=${emulator}&status=${status}` : `/?emulator=${emulator}`}
    />
  );
}
