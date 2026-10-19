import Link from "next/link";
import { EMULATORS, PLATFORM_LABEL } from "@/lib/emulators";
import { emulatorPath, platformPath } from "@/lib/hubs";
import { EMULATOR_IDS, PLATFORMS } from "@/lib/types";

export function EmptySearch({ query }: { query: string }) {
  const searched = query.trim();
  return (
    <div className="rounded-xl border border-dashed p-6 text-sm leading-6 text-muted-foreground">
      <p>
        {searched
          ? `No public compatibility report in this snapshot matches “${searched}”.`
          : "No public compatibility report in this snapshot matches those filters."}{" "}
        PlayableYet lists a game only after a tracked compatibility list publishes a report for it.
      </p>
      <p className="mt-3">Platform and project pages from this snapshot:</p>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {PLATFORMS.map((platform) => (
          <li key={platform}>
            <Link href={platformPath(platform)} className="text-foreground underline decoration-primary/60 underline-offset-4">
              {PLATFORM_LABEL[platform]}
            </Link>
          </li>
        ))}
        {EMULATOR_IDS.map((id) => (
          <li key={id}>
            <Link href={emulatorPath(id)} className="text-foreground underline decoration-primary/60 underline-offset-4">
              {EMULATORS[id].name}
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-3">
        Email alerts are on each game page, for titles already in the snapshot. A search with no report does not
        have a page to watch yet.
      </p>
    </div>
  );
}
