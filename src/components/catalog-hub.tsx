import type { ReactNode } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { serializeJsonLd } from "@/lib/game-jsonld";
import { HUB_PAGE_SIZE } from "@/lib/hubs";
import { breadcrumbJsonLd, linkItemListJsonLd } from "@/lib/site-jsonld";
import { siteUrl } from "@/lib/site";
import type { Status } from "@/lib/types";

export type HubCrumb = { name: string; href: string };
export type HubCount = { status: Status; games: number; href: string };
export type HubRow = { slug: string; name: string; status: Status | null; note: string };
export type HubPagination = { page: number; pages: number; href: (page: number) => string };

export function CatalogHub({
  crumbs,
  pageName,
  pageHref,
  h1,
  description,
  counts,
  lead,
  rows,
  total,
  moreHref,
  pagination,
}: {
  crumbs: HubCrumb[];
  pageName: string;
  pageHref: string;
  h1: string;
  description: string;
  counts: HubCount[];
  lead?: ReactNode;
  rows: HubRow[];
  total: number;
  moreHref: string;
  pagination?: HubPagination;
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

      {lead}

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
        {pagination && pagination.pages > 1 ? <PageLinks pagination={pagination} /> : null}
        <IndexLink pagination={pagination} rows={rows.length} total={total} moreHref={moreHref} />
      </section>
    </main>
  );
}

function IndexLink({
  pagination,
  rows,
  total,
  moreHref,
}: {
  pagination?: HubPagination;
  rows: number;
  total: number;
  moreHref: string;
}) {
  const index = (
    <Link href={moreHref} className="text-foreground underline decoration-primary/60 underline-offset-4">
      Open the filtered index
    </Link>
  );
  if (rows === 0) {
    return <p className="text-sm text-muted-foreground">No games on this page. {index}.</p>;
  }
  if (pagination) {
    const start = (pagination.page - 1) * HUB_PAGE_SIZE + 1;
    const end = start + rows - 1;
    return (
      <p className="text-sm text-muted-foreground">
        Games {start.toLocaleString("en-US")}–{end.toLocaleString("en-US")} of {total.toLocaleString("en-US")}. {index}.
      </p>
    );
  }
  if (total > rows) {
    return (
      <p className="text-sm text-muted-foreground">
        Showing {rows.toLocaleString("en-US")} of {total.toLocaleString("en-US")}. {index}.
      </p>
    );
  }
  return <p className="text-sm text-muted-foreground">{index}.</p>;
}

function PageLinks({ pagination }: { pagination: HubPagination }) {
  const { page, pages, href } = pagination;
  return (
    <nav aria-label="Pagination" className="space-y-3">
      <p className="flex flex-wrap gap-3 text-sm">
        {page > 1 ? (
          <Link href={href(page - 1)} rel="prev" className="underline decoration-primary/60 underline-offset-4">
            Previous
          </Link>
        ) : (
          <span className="text-muted-foreground">Previous</span>
        )}
        {page < pages ? (
          <Link href={href(page + 1)} rel="next" className="underline decoration-primary/60 underline-offset-4">
            Next
          </Link>
        ) : (
          <span className="text-muted-foreground">Next</span>
        )}
      </p>
      <ol className="flex flex-wrap gap-1">
        {Array.from({ length: pages }, (_, index) => {
          const number = index + 1;
          const current = number === page;
          const near = Math.abs(number - page) <= 1;
          return (
            <li key={number}>
              <Link
                href={href(number)}
                prefetch={near ? undefined : false}
                aria-current={current ? "page" : undefined}
                className={
                  current
                    ? "inline-flex min-w-8 justify-center rounded-md bg-primary px-2 py-1 text-sm text-primary-foreground"
                    : "inline-flex min-w-8 justify-center rounded-md border border-border px-2 py-1 text-sm hover:bg-accent/60"
                }
              >
                {number.toLocaleString("en-US")}
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
