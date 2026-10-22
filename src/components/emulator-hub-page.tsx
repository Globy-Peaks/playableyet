import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CatalogHub } from "@/components/catalog-hub";
import { StatusBadge } from "@/components/status-badge";
import { loadCatalog } from "@/lib/catalog";
import { EMULATORS, PLATFORM_LABEL } from "@/lib/emulators";
import { emulatorFaq } from "@/lib/emulator-faq";
import { recentlyPlayable, type FeedItem } from "@/lib/feeds";
import { faqPageJsonLd } from "@/lib/game-faq";
import { serializeJsonLd } from "@/lib/game-jsonld";
import {
  HUB_PAGE_SIZE,
  countByBestStatus,
  coverageFromGames,
  emulatorHeadline,
  emulatorPath,
  emulatorStatusPagePath,
  emulatorStatusPath,
  gamesOnEmulator,
  gamesWithBestStatus,
  hubPageCount,
  hubPageSlice,
  hubRows,
  isEmulatorId,
  isStatusId,
  platformPath,
  rankHubGames,
  reportsOnEmulator,
  statusHeadline,
  titleIdSentence,
  unitExplanation,
} from "@/lib/hubs";
import { STATUS_LABEL } from "@/lib/status";
import { formatEditionList } from "@/lib/title-edition";
import type { EmulatorId, Status } from "@/lib/types";

const RECENT_LIMIT = 8;

async function emulatorView(emulator: EmulatorId, status?: Status, page = 1) {
  const catalog = await loadCatalog();
  const info = EMULATORS[emulator];
  const games = gamesOnEmulator(catalog, emulator);
  const reportsOf = (game: (typeof games)[number]) => reportsOnEmulator(game, emulator);
  const counts = countByBestStatus(games, reportsOf);
  const coverage = coverageFromGames(emulator, games);
  const matched = status ? gamesWithBestStatus(games, reportsOf, status) : games;
  const ranked = status
    ? [...matched].sort((a, b) => a.name.localeCompare(b.name) || a.slug.localeCompare(b.slug))
    : rankHubGames(matched, reportsOf);
  const pages = status ? hubPageCount(matched.length) : 1;
  if (page < 1 || page > pages) notFound();
  const slice = status ? hubPageSlice(ranked, page) : ranked.slice(0, HUB_PAGE_SIZE);
  const h1 = status
    ? statusHeadline(emulator, status, matched.length)
    : emulatorHeadline(emulator, coverage.games, coverage.playableGames);
  const moved = status ? [] : recentlyPlayable(catalog, emulator);
  return {
    info,
    counts,
    coverage,
    h1,
    rows: hubRows(slice, reportsOf),
    total: matched.length,
    page,
    pages,
    faq: status ? [] : emulatorFaq(coverage),
    recent: moved.slice(0, RECENT_LIMIT),
    recentTotal: moved.length,
  };
}

export async function emulatorHubMetadata(emulator: string, status?: string, page = 1): Promise<Metadata> {
  if (!isEmulatorId(emulator) || (status !== undefined && !isStatusId(status))) notFound();
  const view = await emulatorView(emulator, status, page);
  const titleBase =
    status && isStatusId(status) ? `${STATUS_LABEL[status]} games on ${view.info.name}` : `${view.info.name} compatibility`;
  const title = page > 1 ? `${titleBase} (page ${page})` : titleBase;
  const path =
    status && isStatusId(status) ? emulatorStatusPagePath(emulator, status, page) : emulatorPath(emulator);
  const description = page > 1 ? `${view.h1} Page ${page} of ${view.pages}.` : view.h1;
  const pagination = status && isStatusId(status) ? pageLinks(emulator, status, page, view.pages) : undefined;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title, description, url: path },
    ...(pagination ? { pagination } : {}),
  };
}

function pageLinks(emulator: EmulatorId, status: Status, page: number, pages: number): Metadata["pagination"] | undefined {
  if (pages <= 1) return undefined;
  const pagination: NonNullable<Metadata["pagination"]> = {};
  if (page > 1) pagination.previous = emulatorStatusPagePath(emulator, status, page - 1);
  if (page < pages) pagination.next = emulatorStatusPagePath(emulator, status, page + 1);
  return pagination;
}

export async function EmulatorHubPage({
  emulator,
  status,
  page = 1,
}: {
  emulator: string;
  status?: string;
  page?: number;
}) {
  if (!isEmulatorId(emulator)) notFound();
  if (status !== undefined && !isStatusId(status)) notFound();
  const view = await emulatorView(emulator, status, page);
  const path = status ? emulatorStatusPagePath(emulator, status, view.page) : emulatorPath(emulator);
  const pageName = status ? `${STATUS_LABEL[status]} on ${view.info.name}` : view.info.name;
  const units = status ? unitExplanation(view.coverage) : titleIdSentence(view.coverage);
  const faqJsonLd = view.faq.length > 0 ? serializeJsonLd(faqPageJsonLd(view.faq)) : null;
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
      description={`${view.info.summary} ${units} ${listNote(view.info.name, status, view.total, view.page)}`}
      counts={view.counts.map((count) => ({
        ...count,
        href: emulatorStatusPath(emulator, count.status),
      }))}
      lead={
        status ? null : (
          <>
            {faqJsonLd ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: faqJsonLd }} /> : null}
            <section className="max-w-3xl space-y-4">
              <h2 className="text-xl font-semibold tracking-tight">From this snapshot</h2>
              {view.faq.map((entry) => (
                <article key={entry.question} className="space-y-1">
                  <h3 className="font-medium">{entry.question}</h3>
                  <p className="text-sm leading-6 text-muted-foreground">{entry.answer}</p>
                </article>
              ))}
            </section>
            <RecentlyMoved items={view.recent} extra={view.recentTotal - view.recent.length} />
          </>
        )
      }
      rows={view.rows}
      total={view.total}
      moreHref={status ? `/?emulator=${emulator}&status=${status}` : `/?emulator=${emulator}`}
      pagination={
        status && view.pages > 1
          ? {
              page: view.page,
              pages: view.pages,
              href: (nextPage: number) => emulatorStatusPagePath(emulator, status, nextPage),
            }
          : undefined
      }
    />
  );
}

function listNote(name: string, status: Status | undefined, total: number, page: number): string {
  if (!status) {
    const shown = Math.min(HUB_PAGE_SIZE, total);
    return `The list below shows the first ${shown.toLocaleString("en-US")} games by furthest status. Every game is linked from its status pages, ${HUB_PAGE_SIZE.toLocaleString("en-US")} at a time.`;
  }
  if (total === 0) return `No games have a furthest ${name} status of ${STATUS_LABEL[status]} in this snapshot.`;
  const start = (page - 1) * HUB_PAGE_SIZE + 1;
  const end = Math.min(total, page * HUB_PAGE_SIZE);
  return `This page lists games ${start.toLocaleString("en-US")}–${end.toLocaleString("en-US")} of ${total.toLocaleString("en-US")} whose furthest ${name} status is ${STATUS_LABEL[status]}.`;
}

function RecentlyMoved({ items, extra }: { items: FeedItem[]; extra: number }) {
  return (
    <section className="rounded-xl border border-border bg-card">
      <header className="border-b border-border px-4 py-3">
        <h2 className="font-medium">Recently moved to Playable</h2>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          Latest status changes to Playable in this snapshot. The first time a report is seen is not a move.
        </p>
      </header>
      {items.length === 0 ? (
        <p className="px-4 py-5 text-sm leading-6 text-muted-foreground">
          No report in this snapshot has moved to Playable. A first sighting is not a move.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((item) => (
            <li key={`${item.slug}-${item.at}-${item.from ?? ""}`} className="px-4 py-3">
              <Link href={`/games/${item.slug}`} className="font-medium hover:underline">
                {item.name}
              </Link>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {item.from ? (
                  <>
                    <StatusBadge status={item.from} />
                    <span>to</span>
                  </>
                ) : null}
                <StatusBadge status={item.status} />
                <span>Status last changed</span>
                <span className="font-mono">{item.at}</span>
              </p>
              {item.editions.length > 0 ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  <span className="font-mono">{formatEditionList(item.editions)}</span>
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {extra > 0 ? (
        <p className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
          <Link href="/changes" className="underline decoration-primary/60 underline-offset-4">
            {extra.toLocaleString("en-US")} more in the status history
          </Link>
        </p>
      ) : null}
    </section>
  );
}
