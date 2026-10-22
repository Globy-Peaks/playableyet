# PlayableYet

PlayableYet tracks the public playable status of PlayStation games across PS3, PS4, and PS5 in one index.

Projects in the snapshot:

| Project | Kind | Reports in the seed |
| --- | --- | --- |
| RPCS3 | PS3 emulator | 6,781 |
| shadPS4 | PS4 emulator | 1,439 title IDs from 2,300 labeled issues |
| fpPS4 | PS4 emulator | 2,008 |
| SharpEmu | PS5 emulator | 98 |
| KytyPS5 | PS5 emulator | 312 |
| AnyPS5 | PS5 to native porting layer | 251 title IDs from 241 roadmap games |

The seed catalog has **6,049 games** and **10,889 reports**, generated `2026-10-16T04:27:08Z`. RPCS3 still has **126 serials without a title**. AnyPS5 `data/games.json` has **0** join groups (`games[]` is empty; `distinct[]` keeps 1 homebrew pair apart). Stages and open blockers come from the built community roadmap: **169** title IDs have a stage and **85** have open blockers. **Playable** on AnyPS5 is only Dreaming Sarah (`PPSA02929`). Four roadmap rows say Playable; the other three stay In bring-up.

The site does not link to ROMs, firmware, BIOS images, or decryption keys.

## Run locally

```bash
npm install
npm run sync    # refresh data/catalog.json; the site builds /search-index.json from that catalog
npm run dev     # http://127.0.0.1:43123
npm test
npm run build
```

`npm run sync` is polite with public APIs (about 400ms between GitHub pages) and does not need a token. A `GITHUB_TOKEN` with public read access avoids the unauthenticated 60-request hourly cap. shadPS4, SharpEmu, and KytyPS5 use the GitHub API. RPCS3, fpPS4, AnyPS5, and PlayStation-Titles are plain HTTPS fetches.

The sync exits with status 1 if RPCS3, shadPS4, or SharpEmu fail. fpPS4, KytyPS5, and AnyPS5 are skipped on failure and the previous reports for that project are kept.

## Environment

Copy `.env.example` to `.env.local`. Every variable is optional for local `next dev`. Production must set `CRON_SECRET`.

| Variable | Role |
| --- | --- |
| `GITHUB_TOKEN` | GitHub API auth for the sync. |
| `RESEND_API_KEY` | Sends double opt-in and “now playable” mail. If unset, signups are stored and no mail is sent. |
| `RESEND_FROM` | From address. Defaults to `PlayableYet <onboarding@resend.dev>`. |
| `CRON_SECRET` | Required in production. `GET` and `POST /api/cron/sync` require `Authorization: Bearer <secret>`. A missing secret is rejected when `NODE_ENV` or `VERCEL_ENV` is `production`. Local `next dev` allows the route only while the secret is unset. |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob token. Lets cron publish the public catalog. Also used for the watchlist when no dedicated watchlist token is set. |
| `WATCHLIST_BLOB_READ_WRITE_TOKEN` | Optional token for a private Blob store that holds only watchlist signups. Writes use `access: "private"`. |
| `WATCHLIST_BLOB_SECRET` | Optional stable secret. The watchlist pathname is a SHA-256 of this value. When unset, the pathname is derived from the watchlist token or `BLOB_READ_WRITE_TOKEN`. Set this before rotating tokens so existing signups stay reachable. |
| `NEXT_PUBLIC_SITE_URL` | Canonical origin for the sitemap, Open Graph tags, and email links. |

## Where data lives

The simplest store that works on Vercel is a JSON snapshot:

- `data/catalog.json` is the catalog committed with the repo, including status history per game and project. On Vercel it is the fallback when Blob has no snapshot.
- `/search-index.json` is generated from the catalog the pages are serving. It is not a static file from the last deploy.
- `data/sync-meta.json` records the last local sync. `/api/status` is the public health JSON.

The first snapshot is committed so the site works with no database. Later syncs append history when a status changes. The first observation of a report is marked initial and does not show up as a status change.

On Vercel the filesystem is read-only. The cron still publishes when a local write fails. Set `BLOB_READ_WRITE_TOKEN` and the job writes `playableyet/catalog.json`, `playableyet/search-index.json`, and `playableyet/sync-status.json` with `access: "public"`. Those objects are the public snapshot. They do not contain email addresses or watch tokens. Page reads bypass the Blob CDN cache and the catalog cache tag is expired after a publish, so a successful sync shows up on the next request. Without the token, production keeps serving the committed catalog and `/api/status` reports `lastSyncOk: false`.

Watch signups are not part of the catalog. Locally they live in gitignored `data/watchlist.json`. On Vercel they are stored in Blob, but never at the guessable pathname `playableyet/watchlist.json`. The pathname is `playableyet/watch/<sha256>.json`. The hash covers a fixed prefix plus `WATCHLIST_BLOB_SECRET`, or the watchlist token when that secret is unset. The site does not return, link, or log that URL.

`@vercel/blob` supports `access: "private"`. The write tries private first. Private blobs are served from `*.private.blob.vercel-storage.com` and require the read-write token, which is what you want for emails. The project’s current Blob store is public, and a public store rejects private blobs. When the error says the store access does not match, the same unguessable pathname is written with `access: "public"`. Anyone who already has that URL can read it, so it stays unlinked. A private store is the stronger setup: create one and set `WATCHLIST_BLOB_READ_WRITE_TOKEN`. Catalog publishes keep using the public token.

Each successful watchlist read or write deletes `playableyet/watchlist.json` if an older build left it behind. A signup stays pending until the confirmation link is opened. Unsubscribe deletes it. A playable transition notifies confirmed addresses once per project, and only when Resend is configured.

`/llms.txt` is generated from the snapshot the site is serving and includes each project’s playable game count, percentage, and title ID count. `/llms-full.txt` describes sources, statuses, and URL patterns. Game pages include schema.org `VideoGame` structured data with each project’s status id.

## Deploy on Vercel

1. Import the repository as a Next.js project.
2. Add the environment variables you want. `BLOB_READ_WRITE_TOKEN` is what makes the daily job stick. Create a Blob store in the project and use its read-write token.
3. `vercel.json` schedules `/api/cron/sync` at `15 6 * * *` (06:15 UTC). Set `CRON_SECRET` in the production environment. Vercel Cron sends `Authorization: Bearer $CRON_SECRET`. The route rejects the call when that header does not match, and it also rejects the call in production when `CRON_SECRET` is unset.
4. The route allows up to 300 seconds (`maxDuration`). Hobby cron invocations are shorter than that, so a full unauthenticated sync can run out of time. Run `npm run sync` locally and commit the JSON, or use a plan and a `GITHUB_TOKEN` that can finish inside the limit. Check `GET /api/status` for `generatedAt`, `lastSyncOk`, and per-source success. The cron log line starts with `PlayableYet sync summary`.
5. Enable Web Analytics in the Vercel project dashboard. The site includes the Analytics component. The dashboard toggle is off until you turn it on. This does not enable a paid feature by itself.

## What could not be fully synced

- **126 RPCS3 serials** have a status and no title. The HTML compatibility page is blocked, and PlayStation-Titles has no PS3 file. Those rows stay under the serial as the name.
- **shadPS4** issues without a `status-*` label are not fetched. GitHub’s issue list stops at 1,000 results, so each status label is requested on its own. Multiple issues for one title ID collapse to the furthest status.
- **AnyPS5 `data/games.json`** `games[]` is empty, so it joins nothing. That file is only for manual title-ID groups. The sync reads `site/roadmap.json` for the game list, the stage reached on main, and open blockers. One stage source points at a fork outside the allowlist, so that row links to the official repository instead.
- **KytyPS5** uses GitHub issue search, which returns at most 1,000 issues. This run matched 468 and kept 312.
