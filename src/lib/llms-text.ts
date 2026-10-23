import { emulatorFaq } from "@/lib/emulator-faq";
import { EMULATORS } from "@/lib/emulators";
import { emulatorCoverage, emulatorPath } from "@/lib/hubs";
import type { Catalog } from "@/lib/types";

/** Short guide plus the live snapshot counts. Served at /llms.txt. */
export function llmsText(origin: string, catalog: Catalog): string {
  const counts = emulatorCoverage(catalog)
    .map((coverage) => {
      const info = EMULATORS[coverage.emulator];
      const [entry] = emulatorFaq(coverage);
      return [
        `### ${info.name}`,
        "",
        entry?.question ?? "",
        "",
        entry?.answer ?? "",
        "",
        `- Games: ${coverage.playableGames.toLocaleString("en-US")} Playable / ${coverage.games.toLocaleString("en-US")} with a report`,
        `- Title IDs: ${coverage.playableTitleIds.toLocaleString("en-US")} Playable / ${coverage.titleIds.toLocaleString("en-US")} reports`,
        `- Hub: ${origin}${emulatorPath(coverage.emulator)}`,
      ].join("\n");
    })
    .join("\n\n");

  return `${guide(origin)}

## Snapshot counts

Generated from the snapshot at ${catalog.generatedAt}. A game is one page that can group several title IDs. A title ID is one serial's report. Playable games use the furthest report on that project. The percentage is playable games divided by games that have a report for that project. These figures come from this snapshot. They are not copied from a project announcement.

${counts}
`;
}

function guide(origin: string): string {
  return `# PlayableYet

> Public index of PlayStation 3, 4, and 5 compatibility reports. It does not host games or link to ROMs, firmware, BIOS images, or decryption keys.

PlayableYet copies public reports from RPCS3, shadPS4, fpPS4, SharpEmu, KytyPS5, and the AnyPS5 porting layer into one catalog. Status words stay the ones the source used. Counts below are generated from the snapshot this site is serving.

## Start here

- [Home](${origin}/): Search and filter the catalog. Shows newly playable titles and status changes. The project cards count grouped games and title ID reports separately. \`/?q=\` server-renders games whose name or title ID matches, for example \`/?q=tales+of+berseria\`. Filtered URLs are \`noindex\`. \`/search?q=\` redirects to \`/?q=\`.
- [About](${origin}/about): Sources, per-project status definitions, the AnyPS5 warning, and the email privacy note.
- Weekly digest: the home page, \`/changes\`, and game pages include a double opt-in form for a weekly newly playable email across PS3, PS4, and PS5 emulators. Only a confirmed address becomes a Resend contact, with \`source=playableyet\` and the topic “PlayableYet weekly” (default opt-out). Those contacts are not added to the PatchVerdict Newsletter segment. Do not submit the form on behalf of a person.
- [Sponsor](${origin}/sponsor): Paid support. Supporter is a name on the list. Site banner is one reviewed placement, labeled Sponsored, on the home page and game pages. The newsletter placement is hidden unless \`showNewsletterSponsor\` is turned on. \`/sponsor/thanks\` is the page Stripe returns to after payment and is \`noindex\`. Questions: hello@globypeaks.com. No traffic numbers are published.
- [Status changes](${origin}/changes): Games whose status changed between snapshots. The first time a report is seen is not a change.
- [Status change feed](${origin}/feed.xml): RSS 2.0 of those changes.
- [Full guide](${origin}/llms-full.txt): Status meanings, data sources, and URL patterns.
- [Sitemap](${origin}/sitemap.xml): Every game page, plus platform, project, status, and status pagination pages.
- [Search index](${origin}/search-index.json): Public catalog fields used by the browser. Built from the snapshot the site is serving. No email addresses or watch tokens.
- [Sync status](${origin}/api/status): Public JSON with \`generatedAt\`, \`lastSyncAttemptAt\`, \`lastSyncOk\`, \`gameCount\`, and per-source \`id\`, \`ok\`, \`count\`, \`asOf\`, and \`carried\`. When \`ok\` is false and \`carried\` is true, \`count\` is the number of reports kept from an earlier fetch, and those rows are older than \`generatedAt\`. \`asOf\` is the last successful fetch, or null when that time was not recorded. No email addresses or tokens.
- Search matches whole words and word prefixes. It ignores accents and punctuation, so \`/?q=yotei\` matches “Yōtei” and \`/?q=yakuza+dead+souls\` matches “Yakuza: Dead Souls”. Abbreviations such as \`gta\`, \`rdr\`, \`tlou\`, \`gow\`, \`gt7\`, \`des\`, \`mgs\`, and \`ff\` match those series. \`/rss\` and \`/rss.xml\` permanently redirect to \`/feed.xml\`. The page head includes \`<link rel="alternate" type="application/rss+xml" href="/feed.xml">\`.

## Platform and project pages

- [PlayStation 3](${origin}/ps3), [PlayStation 4](${origin}/ps4), [PlayStation 5](${origin}/ps5): status counts and a capped list of games on that platform.
- [RPCS3](${origin}/emulators/rpcs3), [shadPS4](${origin}/emulators/shadps4), [fpPS4](${origin}/emulators/fpps4), [SharpEmu](${origin}/emulators/sharpemu), [KytyPS5](${origin}/emulators/kytyps5), [AnyPS5](${origin}/emulators/anyps5): grouped games, the playable percentage, title ID reports, a short FAQ, and games that recently moved to Playable.
- Status pages use \`/emulators/{project}/{status}\`, for example [Playable games on shadPS4](${origin}/emulators/shadps4/playable). Further pages use \`/emulators/{project}/{status}/{page}\` starting at 2, for example \`/emulators/rpcs3/playable/2\`. Page 1 has no page number. Each page lists up to 40 games and links the other pages, so every game is reachable. \`{status}\` is \`playable\`, \`ingame\`, \`intro\`, \`menus\`, \`loadable\`, \`boots\`, \`in-bring-up\`, or \`nothing\`.

## Game pages

- [Game](${origin}/games/{slug}): One title. \`{slug}\` is lowercase hyphenated words, for example \`/games/dreaming-sarah\`. The page title asks “Is {Game} playable yet?” and the description lists platform and project statuses from that snapshot, keeping each raw label and adding that project’s documented meaning in parentheses when one exists. When title IDs for one project do not share a status, the page says which versions differ. The page includes schema.org VideoGame structured data with each project's status id (\`playable\`, \`ingame\`, \`intro\`, \`menus\`, \`loadable\`, \`boots\`, \`in-bring-up\`, \`nothing\`), FAQPage structured data answering “Is {Game} playable on PC?” and “Which emulator runs {Game} best?” from the snapshot only, plus BreadcrumbList structured data and links to related games, the platform page, and the project pages. Unknown slugs return HTTP 404. The home page includes WebSite and, when the week has them, ItemList structured data for the newly playable rows shown on the page. Platform and project pages include ItemList structured data for the games shown on that page. Each project page also includes FAQPage structured data for how many games are playable on that project.`;
}
