import type { Metadata } from "next";
import Link from "next/link";
import { NewsletterForm } from "@/components/newsletter-form";
import { StatusBadge } from "@/components/status-badge";
import { loadCatalog } from "@/lib/catalog";
import { CHANGES_PAGE_SIZE } from "@/lib/changes-feed";
import { EMULATORS } from "@/lib/emulators";
import { statusChanges } from "@/lib/feeds";
import { statusPhrase } from "@/lib/status-copy";

export const metadata: Metadata = {
  title: "Recent status changes",
  description:
    "Games whose compatibility status changed between PlayableYet snapshots. The first time a report is seen is not a change.",
  alternates: {
    canonical: "/changes",
    types: {
      "application/rss+xml": [{ url: "/feed.xml", title: "PlayableYet status changes" }],
    },
  },
  openGraph: {
    title: "Recent status changes",
    description:
      "Games whose compatibility status changed between PlayableYet snapshots. The first time a report is seen is not a change.",
    url: "/changes",
  },
};

export default async function ChangesPage() {
  const catalog = await loadCatalog();
  const changes = statusChanges(catalog);
  const shown = changes.slice(0, CHANGES_PAGE_SIZE);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:py-12">
      <div className="space-y-3">
        <p className="font-mono text-xs tracking-[0.18em] text-primary uppercase">Snapshot history</p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Recent status changes</h1>
        <p className="text-sm leading-6 text-muted-foreground">
          A row appears when a later snapshot records a different status for the same game and project. The first time a
          report is seen is not a change.{" "}
          <a className="text-foreground underline decoration-primary/60 underline-offset-4" href="/feed.xml">
            RSS feed
          </a>
          .
        </p>
        {catalog.generatedAt ? (
          <p className="text-sm text-muted-foreground">
            Snapshot from {catalog.generatedAt.slice(0, 16).replace("T", " ")} UTC.
          </p>
        ) : null}
      </div>

      <NewsletterForm />

      {shown.length === 0 ? (
        <p className="rounded-xl border border-dashed p-6 text-sm leading-6 text-muted-foreground">
          This snapshot has no status change yet. The first observation of a report is the baseline, not a change.
        </p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {shown.map((item) => (
            <li key={`${item.slug}-${item.emulator}-${item.titleId}-${item.at}-${item.from}-${item.status}`} className="px-4 py-3">
              <Link href={`/games/${item.slug}`} className="font-medium hover:underline">
                {item.name}
              </Link>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>{EMULATORS[item.emulator].name}</span>
                {item.from ? <StatusBadge status={item.from} /> : null}
                <span>to</span>
                <StatusBadge status={item.status} />
                <span className="font-mono">{item.at}</span>
              </p>
              {item.from ? (
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {statusPhrase(item.emulator, item.from)} to {statusPhrase(item.emulator, item.status)}.
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {changes.length > shown.length ? (
        <p className="text-sm text-muted-foreground">
          Showing {shown.length.toLocaleString()} of {changes.length.toLocaleString()} recorded changes. The feed lists the
          same {shown.length.toLocaleString()}.
        </p>
      ) : null}
    </main>
  );
}
