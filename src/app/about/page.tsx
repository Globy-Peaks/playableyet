import type { Metadata } from "next";
import { AnyPs5Warning } from "@/components/anyps5-warning";
import { loadCatalog, loadSyncStatus } from "@/lib/catalog";
import { EMULATORS } from "@/lib/emulators";
import { explainSources, staleSourceMessages } from "@/lib/source-freshness";
import { documentedStatuses } from "@/lib/status-copy";
import {
  ANYPS5_OFFICIAL_REPO,
  ANYPS5_OFFICIAL_SITE,
  ANYPS5_ROADMAP_REPO,
  ANYPS5_ROADMAP_SITE,
} from "@/lib/sync/anyps5";
import { EMULATOR_IDS } from "@/lib/types";

export const metadata: Metadata = {
  title: "About",
  description:
    "How PlayableYet collects public PlayStation compatibility reports, what the statuses mean, and which projects it does not link to.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About · PlayableYet",
    description:
      "Sources, status meanings, and the AnyPS5 warning for the PlayableYet compatibility index.",
    url: "/about",
  },
};

const SOURCES: { name: string; href: string; detail: string }[] = [
  {
    name: "RPCS3",
    href: EMULATORS.rpcs3.siteUrl,
    detail:
      "PS3 emulator. The sync reads the public JSON export and the paged compatibility list. The export has status and date, keyed by serial, and often no title. Names come from the list API. PlayStation-Titles does not include PS3.",
  },
  {
    name: "shadPS4",
    href: EMULATORS.shadps4.siteUrl,
    detail:
      "PS4 emulator. Reports are GitHub issues in shadps4-compatibility/shadps4-game-compatibility. Issue titles look like “CUSAxxxxx - Title”. Status labels are status-playable, status-ingame, status-menus, status-boots, and status-nothing.",
  },
  {
    name: "fpPS4",
    href: EMULATORS.fpps4.siteUrl,
    detail:
      "PS4 emulator. The public list at fpps4.net is aggregated from GitHub issues in red-prig/fpps4-game-compatibility. That site loads api.fpps4.net/database.json, which redirects between http and https and does not return the file. The sync reads those GitHub issues instead, following the Link cursor so lists past 1,000 issues stay complete, and skips system-firmware rows.",
  },
  {
    name: "SharpEmu",
    href: EMULATORS.sharpemu.siteUrl,
    detail:
      "PS5 emulator. Compatibility entries are markdown files in github.com/sharpemu/sharpemu-site. Names for those title IDs come from the PlayStation-Titles index.",
  },
  {
    name: "KytyPS5",
    href: EMULATORS.kytyps5.siteUrl,
    detail:
      "PS5 emulator. The community list is GitHub issues titled “[GAME STATUS]” in KytyPS5/KytyPS5. If that list cannot be read, the sync skips Kyty and keeps the previous snapshot for it.",
  },
];

export default async function AboutPage() {
  const catalog = await loadCatalog();
  const status = await loadSyncStatus();
  const explained = explainSources(status, catalog);
  const notes = staleSourceMessages(explained, catalog.generatedAt);
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-8 sm:py-12">
      <header className="space-y-3">
        <p className="font-mono text-xs tracking-[0.18em] text-primary uppercase">About</p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Public reports, one index</h1>
        <p className="text-base leading-7 text-muted-foreground">
          PlayableYet compares the playable status of PlayStation 3, 4, and 5 games across the projects below. It
          stores a snapshot and a short history so a later sync can show what changed. It does not host games, and it
          never links to ROMs, firmware, BIOS images, or decryption keys.
        </p>
      </header>

      <AnyPs5Warning />

      <section className="space-y-3">
        <h2 className="text-xl font-semibold tracking-tight">Sources</h2>
        <ul className="space-y-4">
          {SOURCES.map((source) => (
            <li key={source.name} className="rounded-xl border border-border bg-card p-4">
              <a className="font-medium underline decoration-primary/60 underline-offset-4" href={source.href}>
                {source.name}
              </a>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{source.detail}</p>
            </li>
          ))}
          <li className="rounded-xl border border-border bg-card p-4">
            <p className="font-medium">AnyPS5</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              A PS5 to native porting layer, not an emulator. The official project is{" "}
              <a className="text-foreground underline decoration-primary/60 underline-offset-4" href={ANYPS5_OFFICIAL_REPO}>
                github.com/boykopovar/AnyPS5
              </a>{" "}
              and{" "}
              <a className="text-foreground underline decoration-primary/60 underline-offset-4" href={ANYPS5_OFFICIAL_SITE}>
                boykopovar.github.io/AnyPS5
              </a>
              . Bring-up stages and open blockers come from the community roadmap{" "}
              <a className="text-foreground underline decoration-primary/60 underline-offset-4" href={ANYPS5_ROADMAP_SITE}>
                alxcbtw.github.io/anyps5-roadmap
              </a>
              , source{" "}
              <a className="text-foreground underline decoration-primary/60 underline-offset-4" href={ANYPS5_ROADMAP_REPO}>
                github.com/AlxcBTW/anyps5-roadmap
              </a>
              . <span className="font-mono">data/games.json</span> only lists title IDs that must be joined or kept
              apart; the built <span className="font-mono">site/roadmap.json</span> is the game list. “Playable” is
              reserved for officially confirmed titles. That is currently Dreaming Sarah, PPSA02929. A roadmap stage
              of Playable stays “In bring-up” here.
            </p>
          </li>
        </ul>
        <p className="text-sm leading-6 text-muted-foreground">
          PS4 and PS5 display names are matched with the MIT-licensed{" "}
          <a
            className="text-foreground underline decoration-primary/60 underline-offset-4"
            href="https://github.com/andshrew/PlayStation-Titles"
          >
            andshrew/PlayStation-Titles
          </a>{" "}
          index. Regional copies of the same game share a page when the index gives them one concept, or when the
          normalized title matches.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold tracking-tight">When a source fails</h2>
        <p className="text-sm leading-6 text-muted-foreground">
          A failed fetch does not delete that project’s rows. The snapshot keeps the last reports, and those rows are
          older than the snapshot date. <span className="font-mono">/api/status</span> sets <span className="font-mono">ok</span>{" "}
          to false. <span className="font-mono">count</span> is the number of reports kept, not a fresh fetch of zero.{" "}
          <span className="font-mono">asOf</span> is the last successful fetch when that time was recorded, and{" "}
          <span className="font-mono">carried</span> is true when the rows are from an earlier fetch.
        </p>
        {notes.length > 0 ? (
          <ul className="space-y-2 text-sm leading-6 text-muted-foreground">
            {notes.map((note) => (
              <li key={note.id}>{note.message}</li>
            ))}
          </ul>
        ) : explained.length > 0 ? (
          <p className="text-sm leading-6 text-muted-foreground">Every tracked source was read for this snapshot.</p>
        ) : (
          <p className="text-sm leading-6 text-muted-foreground">
            This copy has no per-source fetch record yet. After the next sync, a source that could not be read is listed
            here.
          </p>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">What the statuses mean</h2>
        <p className="text-sm leading-6 text-muted-foreground">
          Each row keeps the project’s raw label. The explanation is included only when that project publishes a
          meaning for the label. A label one project does not use is left blank rather than copied from another list.
          RPCS3 publishes Intro and Loadable. Several PS4 and PS5 lists publish Menus and Boots. KytyPS5 does not
          publish a Playable definition. “In bring-up” is PlayableYet’s label for an AnyPS5 community roadmap stage,
          not an official Playable confirmation.
        </p>
        {EMULATOR_IDS.map((id) => {
          const emulator = EMULATORS[id];
          const rows = documentedStatuses(id);
          return (
            <section key={id} className="space-y-2">
              <h3 className="font-medium">
                <a className="underline decoration-primary/60 underline-offset-4" href={emulator.siteUrl}>
                  {emulator.name}
                </a>
              </h3>
              <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
                {rows.map((row) => (
                  <li key={row.status} className="grid gap-1 px-4 py-3 sm:grid-cols-[9rem_1fr] sm:gap-4">
                    <span className="font-medium">{row.label}</span>
                    <span className="text-sm leading-6 text-muted-foreground">{row.gloss}</span>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </section>

      <section className="space-y-3 text-sm leading-6 text-muted-foreground">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">Snapshots and email</h2>
        <p>
          The site reads a JSON catalog committed in this repository. A daily job rebuilds it from the sources. On
          Vercel the filesystem is read-only, so a Blob token is what lets the cron publish a newer snapshot. Without
          that token, the deployed site keeps serving the committed catalog.
        </p>
        <p>
          “Email me when this game becomes playable” stores a pending signup until you open the confirmation link.
          Unsubscribe removes that signup. Mail goes out through Resend when <span className="font-mono">RESEND_API_KEY</span>{" "}
          is set. If the key is missing, signups are stored and no mail is sent.
        </p>
        <p>
          Addresses and confirmation tokens are not in the public catalog or the search index. On Vercel they are
          stored apart from the snapshot: private Blob access when the store accepts it, otherwise an unguessable
          pathname that the site never links to. The catalog snapshot stays public.
        </p>
        <p>
          The weekly digest is a separate list. The form on the home page, the changes page, and each game page asks
          for an address and an unchecked consent box. PlayableYet stores that address as a Resend contact only after
          you open the confirmation link. The contact gets the property <span className="font-mono">source=playableyet</span>{" "}
          and the time you confirmed, and it is opted into the Resend topic “PlayableYet weekly”. That topic defaults
          to opt-out, so other contacts on the same Resend account are not added. The address is not added to the
          PatchVerdict Newsletter segment. Unsubscribe turns off the PlayableYet topic only. It does not globally
          unsubscribe the address, so other mail to that address is unchanged.
        </p>
        <p>
          A confirmation request is kept only until you confirm or for 48 hours, whichever comes first, and it is not a
          subscriber. If sending mail or subscriber storage is not configured, the form says so and does not claim you
          joined. Signup attempts are rate limited per server instance, and a hidden field rejects simple automated
          posts.
        </p>
      </section>
    </main>
  );
}
