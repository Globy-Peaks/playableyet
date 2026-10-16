"use client";

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { EMULATORS } from "@/lib/emulators";
import { matchesSearchFilters } from "@/lib/search-filters";
import { STATUS_LABEL } from "@/lib/status";
import { EMULATOR_IDS, PLATFORMS, STATUSES, type SearchEntry } from "@/lib/types";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const PAGE_SIZE = 40;

export function GameBrowser() {
  const params = useSearchParams();
  const router = useRouter();
  const [entries, setEntries] = useState<SearchEntry[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/search-index.json")
      .then((response) => {
        if (!response.ok) throw new Error("index");
        return response.json() as Promise<SearchEntry[]>;
      })
      .then((data) => {
        if (!cancelled) setEntries(data);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const query = params.get("q") ?? "";
  const platform = params.get("platform") ?? "";
  const emulator = params.get("emulator") ?? "";
  const status = params.get("status") ?? "";
  const page = Math.max(1, Number(params.get("page") ?? "1") || 1);

  function update(next: Record<string, string>) {
    const search = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value) search.set(key, value);
      else search.delete(key);
    }
    if (!("page" in next)) search.delete("page");
    const text = search.toString();
    router.replace(text ? `/?${text}` : "/", { scroll: false });
  }

  const filtered = useMemo(() => {
    if (!entries) return [];
    const needle = query.trim().toLowerCase();
    return entries.filter((entry) =>
      matchesSearchFilters(entry, { query: needle, platform, emulator, status }),
    );
  }, [entries, query, platform, emulator, status]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const slice = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  return (
    <section className="space-y-4">
      <form
        className="grid gap-3"
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          update({
            q: String(data.get("q") ?? ""),
            platform: String(data.get("platform") ?? ""),
            emulator: String(data.get("emulator") ?? ""),
            status: String(data.get("status") ?? ""),
          });
        }}
      >
        <label className="sr-only" htmlFor="game-search">
          Search games
        </label>
        <Input
          id="game-search"
          name="q"
          defaultValue={query}
          placeholder="Search by name or title ID"
          className="h-11 bg-card px-3 text-base"
          onChange={(event) => update({ q: event.target.value })}
        />
        <div className="grid gap-2 sm:grid-cols-3">
          <Filter
            name="platform"
            label="Platform"
            value={platform}
            onChange={(value) => update({ platform: value })}
            options={PLATFORMS.map((item) => [item, item.toUpperCase()])}
          />
          <Filter
            name="emulator"
            label="Project"
            value={emulator}
            onChange={(value) => update({ emulator: value })}
            options={EMULATOR_IDS.map((item) => [item, EMULATORS[item].name])}
          />
          <Filter
            name="status"
            label="Status"
            value={status}
            onChange={(value) => update({ status: value })}
            options={STATUSES.map((item) => [item, STATUS_LABEL[item]])}
          />
        </div>
      </form>

      {error ? (
        <p className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
          The search index did not load. Run <code>npm run sync</code> and refresh.
        </p>
      ) : null}

      {entries === null && !error ? (
        <p className="text-sm text-muted-foreground">Loading the game index…</p>
      ) : null}

      {entries && entries.length === 0 ? (
        <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
          No snapshot yet. Run <code>npm run sync</code> to pull the public compatibility lists.
        </p>
      ) : null}

      {entries && entries.length > 0 ? (
        <>
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {filtered.length.toLocaleString()} games
            {filtered.length !== entries.length ? ` of ${entries.length.toLocaleString()}` : ""}
          </p>
          {slice.length === 0 ? (
            <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
              Nothing matches that search. Clear a filter or try a title ID.
            </p>
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
            <div className="flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                disabled={current <= 1}
                onClick={() => update({ page: String(current - 1), q: query, platform, emulator, status })}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {current} of {pages}
              </span>
              <Button
                type="button"
                variant="outline"
                disabled={current >= pages}
                onClick={() => update({ page: String(current + 1), q: query, platform, emulator, status })}
              >
                Next
              </Button>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
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
    if (!current || rank[report.status] > rank[current.status]) best.set(report.emulator, report);
  }
  return [...best.values()];
}

function Filter({
  name,
  label,
  value,
  options,
  onChange,
}: {
  name: string;
  label: string;
  value: string;
  options: [string, string][];
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1 text-xs text-muted-foreground">
      {label}
      <select
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 rounded-lg border border-input bg-card px-2 text-sm text-foreground"
      >
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
