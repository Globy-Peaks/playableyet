import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { serializeJsonLd } from "@/lib/game-jsonld";
import { breadcrumbJsonLd, linkItemListJsonLd } from "@/lib/site-jsonld";
import { siteUrl } from "@/lib/site";
import type { Status } from "@/lib/types";

export type HubCrumb = { name: string; href: string };
export type HubCount = { status: Status; games: number; href: string };
export type HubRow = { slug: string; name: string; status: Status | null; note: string };

export function CatalogHub({
  crumbs,
  pageName,
  pageHref,
  h1,
  description,
  counts,
  rows,
  total,
  moreHref,
}: {
  crumbs: HubCrumb[];
  pageName: string;
  pageHref: string;
  h1: string;
  description: string;
  counts: HubCount[];
  rows: HubRow[];
  total: number;
  moreHref: string;
}) {
  const origin = siteUrl();
  const breadcrumb = serializeJsonLd(
    breadcrumbJsonLd([
      ...crumbs.map((crumb) => ({ name: crumb.name, url: `${origin}${crumb.href}` })),
      { name: pageName, url: `${origin}${pageHref}` },
    ]),
  );
  const list = serializeJsonLd(
    linkItemListJsonLd(
      pageName,
      rows.map((row) => ({ name: row.name, url: `${origin}/games/${row.slug}` })),
    ),
  );

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: breadcrumb }} />
      {rows.length > 0 ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: list }} /> : null}
      <div className="space-y-3">
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {crumbs.map((crumb) => (
              <li key={crumb.href} className="flex items-center gap-2">
                <Link href={crumb.href} className="hover:text-foreground">
                  {crumb.name}
                </Link>
                <span aria-hidden="true">/</span>
              </li>
            ))}
            <li className="text-foreground">{pageName}</li>
          </ol>
        </nav>
        <h1 className="max-w-4xl text-3xl font-semibold tracking-tight sm:text-4xl">{h1}</h1>
        <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p>
      </div>

      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {counts.map((count) => (
          <Link key={count.status} href={count.href} className="rounded-xl border border-border bg-card px-3 py-3 hover:bg-accent/60">
            <StatusBadge status={count.status} />
            <p className="mt-2 text-sm">
              <span className="font-semibold text-foreground">{count.games.toLocaleString()}</span>
              <span className="text-muted-foreground"> {count.games === 1 ? "game" : "games"}</span>
            </p>
          </Link>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold tracking-tight">Games</h2>
        {rows.length === 0 ? (
          <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">No games match this snapshot.</p>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {rows.map((row) => (
              <li key={row.slug}>
                <Link
                  href={`/games/${row.slug}`}
                  className="flex flex-col gap-2 px-4 py-3 hover:bg-accent/60 sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="font-medium">{row.name}</span>
                  <span className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{row.note}</span>
                    {row.status ? <StatusBadge status={row.status} /> : null}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {total > rows.length ? (
          <p className="text-sm text-muted-foreground">
            Showing {rows.length.toLocaleString()} of {total.toLocaleString()}.{" "}
            <Link href={moreHref} className="text-foreground underline decoration-primary/60 underline-offset-4">
              Open the full filtered index
            </Link>
            .
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            <Link href={moreHref} className="text-foreground underline decoration-primary/60 underline-offset-4">
              Open these games in the index
            </Link>
            .
          </p>
        )}
      </section>
    </main>
  );
}
