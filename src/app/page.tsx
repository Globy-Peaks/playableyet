import { Suspense } from "react";
import Link from "next/link";
import { GameBrowser } from "@/components/game-browser";
import { StatusBadge } from "@/components/status-badge";
import { EMULATORS } from "@/lib/emulators";
import { loadCatalog } from "@/lib/catalog";
import { newlyPlayable, statusChanges, summarize } from "@/lib/feeds";
import { serializeJsonLd } from "@/lib/game-jsonld";
import { SITE_DESCRIPTION, siteUrl } from "@/lib/site";
import { homeJsonLd } from "@/lib/site-jsonld";
import { STATUS_LABEL } from "@/lib/status";

export default async function HomePage() {
  const catalog = await loadCatalog();
  const summary = summarize(catalog);
  const fresh = newlyPlayable(catalog);
  const changes = statusChanges(catalog);
  const synced = summary.games > 0;
  const shown = fresh.slice(0, 8);
  const jsonLd = serializeJsonLd(homeJsonLd(siteUrl(), SITE_DESCRIPTION, shown));

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-8 sm:py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <section className="max-w-3xl space-y-4">
        <p className="font-mono text-xs tracking-[0.18em] text-primary uppercase">PS3 · PS4 · PS5</p>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Is it playable yet?</h1>
        <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
          One index of public compatibility reports for PlayStation games. Search a title, compare RPCS3,
          shadPS4, fpPS4, SharpEmu, KytyPS5, and the AnyPS5 porting layer, and watch a game until it moves to
          Playable.
        </p>
        {synced ? (
          <p className="text-sm text-muted-foreground">
            {summary.games.toLocaleString()} games in the snapshot from{" "}
            {summary.generatedAt.slice(0, 16).replace("T", " ")} UTC.
          </p>
        ) : null}
      </section>

      <section className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {summary.emulators.map((stat) => (
          <div key={stat.emulator} className="rounded-xl border border-border bg-card px-3 py-3">
            <p className="text-sm font-medium">{EMULATORS[stat.emulator].name}</p>
            <p className="mt-1 font-mono text-xs text-muted-foreground">{EMULATORS[stat.emulator].kindLabel}</p>
            <p className="mt-3 text-sm">
              <span className="font-semibold text-foreground">{stat.playable.toLocaleString()}</span>
              <span className="text-muted-foreground"> playable</span>
            </p>
            <p className="text-xs text-muted-foreground">{stat.reports.toLocaleString()} reports</p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Feed
          title="Newly playable this week"
          empty="No playable report is dated in the last 7 days of this snapshot."
          items={shown}
          extra={fresh.length > 8 ? fresh.length - 8 : 0}
          kind="new"
        />
        <Feed
          title="Status changes"
          empty="Changes show up after the next sync sees a different status for the same game. This snapshot is the baseline."
          items={changes.slice(0, 8)}
          extra={changes.length > 8 ? changes.length - 8 : 0}
          kind="change"
        />
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">All tracked games</h2>
          <p className="text-sm text-muted-foreground">Filter by platform, project, or status. Results stay on this page.</p>
        </div>
        <Suspense fallback={<p className="text-sm text-muted-foreground">Loading filters…</p>}>
          <GameBrowser />
        </Suspense>
      </section>
    </main>
  );
}

function Feed({
  title,
  empty,
  items,
  extra,
  kind,
}: {
  title: string;
  empty: string;
  items: {
    slug: string;
    name: string;
    emulator: keyof typeof EMULATORS;
    at: string;
    status: keyof typeof STATUS_LABEL;
    from?: keyof typeof STATUS_LABEL;
  }[];
  extra: number;
  kind: "new" | "change";
}) {
  return (
    <section className="rounded-xl border border-border bg-card">
      <header className="border-b border-border px-4 py-3">
        <h2 className="font-medium">{title}</h2>
      </header>
      {items.length === 0 ? (
        <p className="px-4 py-5 text-sm leading-6 text-muted-foreground">{empty}</p>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((item) => (
            <li key={`${item.slug}-${item.emulator}-${item.at}-${item.status}`} className="px-4 py-3">
              <Link href={`/games/${item.slug}`} className="font-medium hover:underline">
                {item.name}
              </Link>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>{EMULATORS[item.emulator].name}</span>
                {kind === "change" && item.from ? (
                  <>
                    <StatusBadge status={item.from} />
                    <span>to</span>
                  </>
                ) : null}
                <StatusBadge status={item.status} />
                <span className="font-mono">{item.at}</span>
              </p>
            </li>
          ))}
        </ul>
      )}
      {extra > 0 ? <p className="border-t border-border px-4 py-2 text-xs text-muted-foreground">{extra} more in this snapshot.</p> : null}
    </section>
  );
}
