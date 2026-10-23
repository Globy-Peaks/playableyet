import Link from "next/link";
import { EmptySearch } from "@/components/empty-search";
import { StatusBadge } from "@/components/status-badge";
import { EMULATORS } from "@/lib/emulators";
import { homeSearchHref, SEARCH_PAGE_SIZE, searchCountLabel, type HomeSearch } from "@/lib/home-search";
import { STATUS_LABEL } from "@/lib/status";
import { EMULATOR_IDS, PLATFORMS, STATUSES, type SearchEntry } from "@/lib/types";

export function ServerSearch({
  search,
  matches,
  total,
}: {
  search: HomeSearch;
  matches: SearchEntry[];
  total: number;
}) {
  const filtered = Boolean(search.q || search.platform || search.emulator || search.status || search.page > 1);
  const pages = Math.max(1, Math.ceil(matches.length / SEARCH_PAGE_SIZE));
  const current = Math.min(search.page, pages);
  const slice = matches.slice((current - 1) * SEARCH_PAGE_SIZE, current * SEARCH_PAGE_SIZE);

  return (
    <div className="server-search space-y-4">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Search games</h2>
        <p className="text-sm text-muted-foreground">
          Search by name or title ID. This form lists matching games in the page itself.
        </p>
      </div>
      <form className="grid gap-3" method="get" action="/" role="search">
        <label className="sr-only" htmlFor="server-game-search">
          Search games
        </label>
        <input
          id="server-game-search"
          name="q"
          defaultValue={search.q}
          placeholder="Search by name or title ID"
          className="h-11 rounded-lg border border-input bg-card px-3 text-base"
        />
        <div className="grid gap-2 sm:grid-cols-3">
          <Select name="platform" label="Platform" value={search.platform} options={PLATFORMS.map((item) => [item, item.toUpperCase()])} />
          <Select
            name="emulator"
            label="Project"
            value={search.emulator}
            options={EMULATOR_IDS.map((item) => [item, EMULATORS[item].name])}
          />
          <Select name="status" label="Status" value={search.status} options={STATUSES.map((item) => [item, STATUS_LABEL[item]])} />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground">
            Search
          </button>
          {filtered ? (
            <Link href="/" className="text-sm text-muted-foreground underline decoration-primary/60 underline-offset-4">
              Clear search
            </Link>
          ) : null}
        </div>
      </form>

      {filtered ? (
        <>
          <p className="text-sm text-muted-foreground">
            {searchCountLabel(matches.length, total)}
          </p>
          {slice.length === 0 ? (
            <EmptySearch query={search.q} />
          ) : (
            <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
              {slice.map((entry) => (
                <li key={entry.slug}>
                  <Link
                    href={`/games/${entry.slug}`}
                    className="flex flex-col gap-2 px-4 py-3 hover:bg-accent/60 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span>
                      <span className="block font-medium">{entry.name}</span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {entry.ids.slice(0, 4).join(" · ")}
                        {entry.ids.length > 4 ? ` · +${entry.ids.length - 4}` : ""}
                      </span>
                    </span>
                    <span className="flex flex-wrap gap-1.5">
                      {uniqueReports(entry).map((report) => (
                        <span key={report.emulator} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                          <span>{EMULATORS[report.emulator].name}</span>
                          <StatusBadge status={report.status} />
                        </span>
                      ))}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {pages > 1 ? (
            <div className="flex items-center justify-between gap-3 text-sm">
              {current > 1 ? (
                <Link href={homeSearchHref(search, current - 1)} className="underline decoration-primary/60 underline-offset-4">
                  Previous
                </Link>
              ) : (
                <span className="text-muted-foreground">Previous</span>
              )}
              <span className="text-muted-foreground">
                Page {current} of {pages}
              </span>
              {current < pages ? (
                <Link href={homeSearchHref(search, current + 1)} className="underline decoration-primary/60 underline-offset-4">
                  Next
                </Link>
              ) : (
                <span className="text-muted-foreground">Next</span>
              )}
            </div>
          ) : null}
        </>
      ) : (
        <p className="text-sm text-muted-foreground">Submit a search to list matching games on this page.</p>
      )}
    </div>
  );
}

function Select({
  name,
  label,
  value,
  options,
}: {
  name: string;
  label: string;
  value: string;
  options: [string, string][];
}) {
  return (
    <label className="grid gap-1 text-xs text-muted-foreground">
      {label}
      <select name={name} defaultValue={value} className="h-9 rounded-lg border border-input bg-card px-2 text-sm text-foreground">
        <option value="">Any</option>
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

function uniqueReports(entry: SearchEntry) {
  const best = new Map<string, SearchEntry["reports"][number]>();
  const rank: Record<string, number> = {
    playable: 8,
    ingame: 7,
    intro: 6,
    menus: 5,
    loadable: 4,
    boots: 3,
    "in-bring-up": 2,
    nothing: 1,
  };
  for (const report of entry.reports) {
    const current = best.get(report.emulator);
    if (!current || (rank[report.status] ?? 0) > (rank[current.status] ?? 0)) best.set(report.emulator, report);
  }
  return [...best.values()];
}
