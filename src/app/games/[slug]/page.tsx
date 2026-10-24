import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { AnyPs5Warning } from "@/components/anyps5-warning";
import { NewsletterForm } from "@/components/newsletter-form";
import { SponsoredBanner } from "@/components/sponsored-banner";
import { StatusBadge } from "@/components/status-badge";
import { VersionCallout } from "@/components/version-callout";
import { WatchForm } from "@/components/watch-form";
import { loadCatalog, loadGame } from "@/lib/catalog";
import { EMULATORS, PLATFORM_LABEL } from "@/lib/emulators";
import { faqPageJsonLd, gameFaq } from "@/lib/game-faq";
import { gameSeoDescription, gameSeoTitle } from "@/lib/game-seo";
import { serializeJsonLd, videoGameJsonLd } from "@/lib/game-jsonld";
import { emulatorPath, emulatorStatusPath, platformPath } from "@/lib/hubs";
import { primaryPlatform, relatedGames } from "@/lib/related";
import { allowedHttpUrl, siteUrl } from "@/lib/site";
import { breadcrumbJsonLd } from "@/lib/site-jsonld";
import { latestStatusChangeAt } from "@/lib/report-dates";
import { bestStatus } from "@/lib/status";
import { statusPhrase } from "@/lib/status-copy";
import {
  ANYPS5_OFFICIAL_REPO,
  ANYPS5_OFFICIAL_SITE,
  ANYPS5_ROADMAP_REPO,
  ANYPS5_ROADMAP_SITE,
  anyps5RoadmapGameUrl,
} from "@/lib/sync/anyps5";
import { titleEditionLabel } from "@/lib/title-edition";
import { EMULATOR_IDS, PLATFORMS, type BringUp, type Game, type Platform } from "@/lib/types";
import { readCatalogFile } from "@/lib/catalog-store";
import { publishCatalog } from "@/lib/title-groups";

async function resolveGame(slug: string): Promise<Game> {
  const game = await loadGame(slug);
  if (!game) notFound();
  if (game.slug !== slug) permanentRedirect(`/games/${game.slug}`);
  return game;
}

export async function generateStaticParams() {
  const catalog = readCatalogFile();
  const games = catalog ? publishCatalog(catalog).games : [];
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
  const game = await resolveGame(slug);
  const title = gameSeoTitle(game.name);
  const description = gameSeoDescription(game);
  const canonical = `/games/${game.slug}`;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "article",
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function GamePage({ params }: PageProps<"/games/[slug]">) {
  const { slug } = await params;
  const game = await resolveGame(slug);
  return <GameArticle game={game} />;
}

async function GameArticle({ game }: { game: Game }) {

  const playable = game.reports.some((report) => report.status === "playable");
  const hasAny = game.reports.some((report) => report.emulator === "anyps5");
  const history = [...game.history].reverse();
  const description = gameSeoDescription(game);
  const origin = siteUrl();
  const pageUrl = `${origin}/games/${game.slug}`;
  const platform = primaryPlatform(game);
  const jsonLd = serializeJsonLd(videoGameJsonLd(game, pageUrl, description));
  const breadcrumb = serializeJsonLd(
    breadcrumbJsonLd([
      { name: "Games", url: `${origin}/` },
      { name: PLATFORM_LABEL[platform], url: `${origin}${platformPath(platform)}` },
      { name: game.name, url: pageUrl },
    ]),
  );
  const catalog = await loadCatalog();
  const related = relatedGames(catalog.games, game);
  const faq = gameFaq(game);
  const faqJsonLd = serializeJsonLd(faqPageJsonLd(faq));

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: faqJsonLd }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: breadcrumb }} />
      <div className="space-y-3">
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <li>
              <Link href="/" className="hover:text-foreground">
                Games
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href={platformPath(platform)} className="hover:text-foreground">
                {PLATFORM_LABEL[platform]}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="text-foreground">{game.name}</li>
          </ol>
        </nav>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{game.name}</h1>
        <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p>
        <ul className="flex flex-wrap gap-2">
          {game.titles.map((title) => (
            <li
              key={title.id}
              className="rounded-full border border-border bg-card px-2.5 py-1 font-mono text-xs text-muted-foreground"
            >
              {title.id}
              <span className="ml-2 font-sans text-foreground/70">{PLATFORM_LABEL[title.platform]}</span>
              <span className="ml-2 font-sans text-foreground/70">{titleEditionLabel(title.id, title.region)}</span>
            </li>
          ))}
        </ul>
      </div>

      <VersionCallout game={game} />

      <SponsoredBanner />

      <section className="max-w-3xl space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">Questions from this snapshot</h2>
        {faq.map((entry) => (
          <article key={entry.question} className="space-y-1">
            <h3 className="font-medium">{entry.question}</h3>
            <p className="text-sm leading-6 text-muted-foreground">{entry.answer}</p>
          </article>
        ))}
      </section>

      {hasAny ? <AnyPs5Warning /> : null}

      <section className="grid gap-4 lg:grid-cols-3">
        {PLATFORMS.map((platform) => (
          <PlatformColumn key={platform} platform={platform} game={game} />
        ))}
      </section>

      <WatchForm slug={game.slug} gameName={game.name} alreadyPlayable={playable} />

      <section className="space-y-3">
        <h2 className="text-xl font-semibold tracking-tight">Related games</h2>
        {related.length === 0 ? (
          <p className="text-sm text-muted-foreground">No other game in this snapshot shares a name stem or a close status on the same platform.</p>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {related.map((item) => (
              <li key={item.slug}>
                <Link href={`/games/${item.slug}`} className="block px-4 py-3 font-medium hover:bg-accent/60">
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card">
        <header className="border-b border-border px-4 py-3">
          <h2 className="font-medium">Status history</h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Status last changed is the day a sync recorded a different status. Data synced is the date on the source
            report. Those two days can differ.
          </p>
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
                  <span className="text-xs text-muted-foreground">
                    {titleEditionLabel(event.titleId, game.titles.find((title) => title.id === event.titleId)?.region)}
                  </span>
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

      <NewsletterForm />
    </main>
  );
}

function PlatformColumn({ platform, game }: { platform: Platform; game: Game }) {
  const reports = game.reports.filter((report) => EMULATORS[report.emulator].platform === platform);
  const overall = bestStatus(reports.map((report) => report.status));
  return (
    <section className="rounded-xl border border-border bg-card">
      <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <h2 className="font-medium">
          <Link href={platformPath(platform)} className="hover:underline">
            {PLATFORM_LABEL[platform]}
          </Link>
        </h2>
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
                    <p className="font-medium">
                      <Link href={emulatorPath(report.emulator)} className="hover:underline">
                        {emulator.name}
                      </Link>
                    </p>
                    <p className="text-xs text-muted-foreground">{emulator.kindLabel}</p>
                  </div>
                  <Link href={emulatorStatusPath(report.emulator, report.status)}>
                    <StatusBadge status={report.status} />
                  </Link>
                </div>
                <p className="text-sm leading-6 text-muted-foreground">{statusPhrase(report.emulator, report.status)}</p>
                <ReportDates game={game} report={report} />
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

function ReportDates({ game, report }: { game: Game; report: Game["reports"][number] }) {
  const region = game.titles.find((title) => title.id === report.titleId)?.region;
  const changedAt = latestStatusChangeAt(game.history, report.emulator, report.titleId);
  return (
    <div className="space-y-1 text-xs text-muted-foreground">
      <p>
        <span className="font-mono text-foreground/80">{report.titleId}</span>
        <span> · {titleEditionLabel(report.titleId, region)}</span>
        {report.os?.length ? ` · ${report.os.join(", ")}` : ""}
      </p>
      <dl className="grid gap-1">
        {changedAt ? (
          <div className="flex flex-wrap gap-x-2">
            <dt>Status last changed</dt>
            <dd className="font-mono text-foreground/80">{changedAt}</dd>
          </div>
        ) : null}
        <div className="flex flex-wrap gap-x-2">
          <dt>Data synced</dt>
          <dd className="font-mono text-foreground/80">{report.updatedAt}</dd>
        </div>
      </dl>
    </div>
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
