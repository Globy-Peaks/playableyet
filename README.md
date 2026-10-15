# PlayableYet

PlayableYet tracks the public playable status of PlayStation games across PS3, PS4, and PS5 in one index.

Projects in the snapshot:

| Project | Kind | Reports in the seed |
| --- | --- | --- |
| RPCS3 | PS3 emulator | 6,781 |
| shadPS4 | PS4 emulator | 1,438 title IDs from 2,298 labeled issues |
| fpPS4 | PS4 emulator | 2,008 |
| SharpEmu | PS5 emulator | 97 |
| KytyPS5 | PS5 emulator | 310 |
| AnyPS5 | PS5 to native porting layer | 25 |

The seed catalog has **5,932 games** and **10,659 reports**, generated `2026-10-15T21:48:24Z`. RPCS3 still has **126 serials without a title**. AnyPS5 `games.json` joined **0** groups, so bring-up IDs come from the roadmap blockers file. **Playable** on AnyPS5 is only Dreaming Sarah (`PPSA02929`). KytyPS5 issues in this snapshot top out at Ingame; none used a playable status.

The site does not link to ROMs, firmware, BIOS images, or decryption keys.

## Run locally

```bash
npm install
npm run sync    # refresh data/catalog.json and public/search-index.json
npm run dev     # http://127.0.0.1:43123
npm test
npm run build
```

`npm run sync` is polite with public APIs (about 400ms between GitHub pages) and does not need a token. A `GITHUB_TOKEN` with public read access avoids the unauthenticated 60-request hourly cap. shadPS4, SharpEmu, and KytyPS5 use the GitHub API. RPCS3, fpPS4, AnyPS5, and PlayStation-Titles are plain HTTPS fetches.

The sync exits with status 1 if RPCS3, shadPS4, or SharpEmu fail. fpPS4, KytyPS5, and AnyPS5 are skipped on failure and the previous reports for that project are kept.

## Environment

Copy `.env.example` to `.env.local`. Every variable is optional.

| Variable | Role |
| --- | --- |
| `GITHUB_TOKEN` | GitHub API auth for the sync. |
| `RESEND_API_KEY` | Sends double opt-in and “now playable” mail. If unset, signups are stored and no mail is sent. |
| `RESEND_FROM` | From address. Defaults to `PlayableYet <onboarding@resend.dev>`. |
| `CRON_SECRET` | When set, `GET` and `POST /api/cron/sync` require `Authorization: Bearer <secret>`. |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob token. Lets cron publish a new catalog. Watchlist signups are stored in a private blob when this is set. |
| `NEXT_PUBLIC_SITE_URL` | Canonical origin for the sitemap, Open Graph tags, and email links. |

## Where data lives

The simplest store that works on Vercel is a JSON snapshot:

- `data/catalog.json` is the catalog the site renders, including status history per game and project.
- `public/search-index.json` is the client search index.
- `data/sync-meta.json` records the last sync.

The first snapshot is committed so the site works with no database. Later syncs append history when a status changes. The first observation of a report is marked initial and does not show up as a status change.

On Vercel the filesystem is read-only, so cron cannot rewrite those files. Set `BLOB_READ_WRITE_TOKEN` and the job writes `playableyet/catalog.json` and `playableyet/search-index.json`. The site prefers the blob when the token is present and falls back to the committed files.

Watch signups are not part of the catalog. They live in gitignored `data/watchlist.json` locally, and in a private blob `playableyet/watchlist.json` when the token is set. A signup stays pending until the confirmation link is opened. Unsubscribe deletes it. A playable transition notifies confirmed addresses once per project, and only when Resend is configured.

## Deploy on Vercel

1. Import the repository as a Next.js project.
2. Add the environment variables you want. `BLOB_READ_WRITE_TOKEN` is what makes the daily job stick. Create a Blob store in the project and use its read-write token.
3. `vercel.json` schedules `/api/cron/sync` at `15 6 * * *` (06:15 UTC). Vercel Cron sends `Authorization: Bearer $CRON_SECRET` when that variable exists.
4. The route allows up to 300 seconds (`maxDuration`). Hobby cron invocations are shorter than that, so a full unauthenticated sync can run out of time. Run `npm run sync` locally and commit the JSON, or use a plan and a `GITHUB_TOKEN` that can finish inside the limit.

## What could not be fully synced

- **126 RPCS3 serials** have a status and no title. The HTML compatibility page is blocked, and PlayStation-Titles has no PS3 file. Those rows stay under the serial as the name.
- **shadPS4** issues without a `status-*` label are not fetched. GitHub’s issue list stops at 1,000 results, so each status label is requested on its own. Multiple issues for one title ID collapse to the furthest status.
- **AnyPS5 `data/games.json`** currently has an empty `games` array. Bring-up IDs come from `data/blockers.json`. Community “playable” claims are not promoted.
- **KytyPS5** uses GitHub issue search, which returns at most 1,000 issues. This run matched 464 and kept 310.
