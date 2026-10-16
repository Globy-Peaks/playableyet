import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AnyPs5Warning } from "@/components/anyps5-warning";
import { StatusBadge } from "@/components/status-badge";
import { WatchForm } from "@/components/watch-form";
import { EMULATORS, PLATFORM_LABEL } from "@/lib/emulators";
import { serializeJsonLd, videoGameJsonLd } from "@/lib/game-jsonld";
import { loadGame } from "@/lib/catalog";
import { allowedHttpUrl, siteUrl } from "@/lib/site";
import { STATUS_DETAIL, STATUS_LABEL, bestStatus } from "@/lib/status";
import {
  ANYPS5_OFFICIAL_REPO,
  ANYPS5_OFFICIAL_SITE,
  ANYPS5_ROADMAP_REPO,
  ANYPS5_ROADMAP_SITE,
  anyps5RoadmapGameUrl,
} from "@/lib/sync/anyps5";
import { EMULATOR_IDS, PLATFORMS, type BringUp, type Game, type Platform, type Status } from "@/lib/types";
import { readCatalogFile } from "@/lib/catalog-store";

export async function generateStaticParams() {
  const catalog = readCatalogFile();
  const games = catalog?.games ?? [];
  const preferred = games.filter((game) =>
    game.reports.some((report) => report.titleId === "PPSA02929"),
  );
  const sample = games.filter((game) => game.reports.some((report) => report.status === "playable"));
  const slugs = new Set<string>();
  for (const game of [...preferred, ...sample]) {
    slugs.add(game.slug);
    if (slugs.size >= 36) break;
  }
  if (slugs.size === 0 && games[0]) slugs.add(games[0].slug);
  return [...slugs].map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/games/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const game = await loadGame(slug);
  if (!game) return { title: "Game not found" };
  const description = describeGame(game);
  return {
    title: game.name,
    description,
    alternates: { canonical: `/games/${slug}` },
    openGraph: {
      title: `${game.name} · PlayableYet`,
      description,
      url: `/games/${slug}`,
      type: "article",
    },
    twitter: { card: "summary", title: game.name, description },
  };
}

export default function GamePage({ params }: PageProps<"/games/[slug]">) {
  return (
    <Suspense fallback={<GameFallback />}>
      <GameArticle params={params} />
    </Suspense>
  );
}

async function GameArticle({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const game = await loadGame(slug);
  if (!game) notFound();

  const playable = game.reports.some((report) => report.status === "playable");
  const hasAny = game.reports.some((report) => report.emulator === "anyps5");
  const history = [...game.history].reverse();
  const description = describeGame(game);
  const jsonLd = serializeJsonLd(videoGameJsonLd(game, `${siteUrl()}/games/${slug}`, description));

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">
            Games
          </Link>
          <span aria-hidden="true"> / </span>
          <span>{game.name}</span>
        </p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{game.name}</h1>
        <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p>
        <ul className="flex flex-wrap gap-2">
          {game.titles.map((title) => (
            <li
              key={title.id}
              className="rounded-full border border-border bg-card px-2.5 py-1 font-mono text-xs text-muted-foreground"
            >
              {title.id}
              <span className="ml-2 text-foreground/70">{PLATFORM_LABEL[title.platform]}</span>
            </li>
          ))}
        </ul>
      </div>

      {hasAny ? <AnyPs5Warning /> : null}

      <section className="grid gap-4 lg:grid-cols-3">
        {PLATFORMS.map((platform) => (
          <PlatformColumn key={platform} platform={platform} game={game} />
        ))}
      </section>

      <WatchForm slug={game.slug} gameName={game.name} alreadyPlayable={playable} />

      <section className="rounded-xl border border-border bg-card">
        <header className="border-b border-border px-4 py-3">
          <h2 className="font-medium">Status history</h2>
        </header>
        {history.length === 0 ? (
          <p className="px-4 py-5 text-sm text-muted-foreground">No history in this snapshot.</p>
        ) : (
          <ul className="divide-y divide-border">
            {history.slice(0, 24).map((event) => (
              <li
                key={`${event.emulator}-${event.titleId}-${event.at}-${event.status}-${event.initial}`}
                className="flex flex-col gap-1 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{EMULATORS[event.emulator].name}</span>
                  <span className="font-mono text-xs text-muted-foreground">{event.titleId}</span>
                  {event.initial ? (
                    <span className="text-muted-foreground">First seen</span>
                  ) : event.from ? (
                    <>
                      <StatusBadge status={event.from} />
                      <span className="text-muted-foreground">to</span>
                    </>
                  ) : null}
                  <StatusBadge status={event.status} />
                </span>
                <span className="font-mono text-xs text-muted-foreground">{event.at}</span>
              </li>
            ))}
          </ul>
        )}
        {history.length > 24 ? (
          <p className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
            Showing the latest 24 of {history.length} recorded events.
          </p>
        ) : null}
      </section>

      <section className="space-y-2 text-sm leading-6 text-muted-foreground">
        <h2 className="font-medium text-foreground">Sources</h2>
        <p>
          Statuses on this page are copied from public compatibility reports. PlayableYet does not link to ROMs,
          firmware, BIOS, or decryption keys.
        </p>
        <ul className="grid gap-1 sm:grid-cols-2">
          {EMULATOR_IDS.filter((id) => game.reports.some((report) => report.emulator === id)).map((id) => (
            <li key={id}>
              <a className="text-foreground underline decoration-primary/60 underline-offset-4" href={EMULATORS[id].siteUrl}>
                {EMULATORS[id].name}
              </a>
              <span> · {EMULATORS[id].kindLabel}</span>
            </li>
          ))}
          {hasAny ? (
            <li>
              <a className="text-foreground underline decoration-primary/60 underline-offset-4" href={ANYPS5_ROADMAP_SITE}>
                AnyPS5 community roadmap
              </a>
              <span>
                {" "}
                ·{" "}
                <a className="text-foreground underline decoration-primary/60 underline-offset-4" href={ANYPS5_ROADMAP_REPO}>
                  source
                </a>
              </span>
            </li>
          ) : null}
        </ul>
      </section>
    </main>
  );
}

function PlatformColumn({ platform, game }: { platform: Platform; game: Game }) {
  const reports = game.reports.filter((report) => EMULATORS[report.emulator].platform === platform);
  const overall = bestStatus(reports.map((report) => report.status));
  return (
    <section className="rounded-xl border border-border bg-card">
      <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <h2 className="font-medium">{PLATFORM_LABEL[platform]}</h2>
        {overall ? <StatusBadge status={overall} /> : null}
      </header>
      {reports.length === 0 ? (
        <p className="px-4 py-5 text-sm text-muted-foreground">No public report for this platform.</p>
      ) : (
        <ul className="divide-y divide-border">
          {reports.map((report) => {
            const emulator = EMULATORS[report.emulator];
            const href = allowedHttpUrl(report.sourceUrl, emulator.projectUrl);
            return (
              <li key={`${report.emulator}-${report.titleId}`} className="space-y-2 px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{emulator.name}</p>
                    <p className="text-xs text-muted-foreground">{emulator.kindLabel}</p>
                  </div>
                  <StatusBadge status={report.status} />
                </div>
                <p className="text-sm leading-6 text-muted-foreground">{STATUS_DETAIL[report.status]}</p>
                <p className="font-mono text-xs text-muted-foreground">
                  {report.titleId} · updated {report.updatedAt}
                  {report.os?.length ? ` · ${report.os.join(", ")}` : ""}
                </p>
                {report.note ? <p className="text-sm leading-6 text-muted-foreground">{report.note}</p> : null}
                {report.bringUp ? <BringUpSummary bringUp={report.bringUp} /> : null}
                {report.emulator === "anyps5" ? (
                  <AnyPs5Links titleId={report.titleId} evidenceUrl={href} />
                ) : (
                  <a className="inline-block text-sm underline decoration-primary/60 underline-offset-4" href={href}>
                    Source report
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function BringUpSummary({ bringUp }: { bringUp: BringUp }) {
  return (
    <div className="space-y-2 rounded-lg border border-border bg-background/60 p-3 text-sm">
      <p>
        <span className="text-muted-foreground">Stage reached </span>
        <span className="font-medium text-foreground">{bringUp.stage ?? "Not recorded"}</span>
      </p>
      {bringUp.detail ? <p className="text-muted-foreground">{bringUp.detail}</p> : null}
      <div>
        <p className="text-muted-foreground">Open blockers</p>
        {bringUp.blockers.length === 0 ? (
          <p className="text-muted-foreground">None recorded.</p>
        ) : (
          <ul className="mt-1 list-disc space-y-1 pl-4 text-muted-foreground">
            {bringUp.blockers.map((blocker) => (
              <li key={blocker.id}>
                {blocker.url ? (
                  <a className="text-foreground underline decoration-primary/60 underline-offset-4" href={blocker.url}>
                    {blocker.id}
                  </a>
                ) : (
                  <span className="text-foreground">{blocker.id}</span>
                )}
                {blocker.title ? ` — ${blocker.title}` : ""}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function AnyPs5Links({ titleId, evidenceUrl }: { titleId: string; evidenceUrl: string }) {
  const links = [
    ["Official project", ANYPS5_OFFICIAL_REPO],
    ["Official site", ANYPS5_OFFICIAL_SITE],
    ["Community roadmap", anyps5RoadmapGameUrl(titleId)],
    ["Roadmap source", ANYPS5_ROADMAP_REPO],
  ];
  const evidence = evidenceUrl !== ANYPS5_OFFICIAL_REPO ? evidenceUrl : "";
  return (
    <ul className="space-y-1 text-sm">
      {links.map(([label, href]) => (
        <li key={label}>
          <a className="underline decoration-primary/60 underline-offset-4" href={href}>
            {label}
          </a>
        </li>
      ))}
      {evidence ? (
        <li>
          <a className="underline decoration-primary/60 underline-offset-4" href={evidence}>
            Stage source
          </a>
        </li>
      ) : null}
    </ul>
  );
}

function describeGame(game: Game) {
  const bits = EMULATOR_IDS.flatMap((id) => {
    const reports = game.reports.filter((report) => report.emulator === id);
    const status = bestStatus(reports.map((report) => report.status));
    if (!status) return [];
    return [`${EMULATORS[id].name} ${statusLabel(status)}`];
  });
  if (bits.length === 0) return `${game.name} has no public compatibility report in this snapshot.`;
  return `${game.name}: ${bits.join(", ")}.`;
}

function statusLabel(status: Status) {
  return STATUS_LABEL[status];
}

function GameFallback() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-12">
      <p className="text-sm text-muted-foreground">Loading this game…</p>
    </main>
  );
}
