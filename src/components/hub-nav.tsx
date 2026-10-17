import Link from "next/link";
import { EMULATORS, PLATFORM_LABEL } from "@/lib/emulators";
import { emulatorPath, platformPath } from "@/lib/hubs";
import { EMULATOR_IDS, PLATFORMS } from "@/lib/types";

export function HubNav() {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Browse by platform and project</h2>
        <p className="text-sm text-muted-foreground">Each page counts statuses from this snapshot and links to the games.</p>
      </div>
      <ul className="flex flex-wrap gap-2 text-sm">
        {PLATFORMS.map((platform) => (
          <li key={platform}>
            <Link href={platformPath(platform)} className="rounded-full border border-border bg-card px-3 py-1 hover:bg-accent/60">
              {PLATFORM_LABEL[platform]}
            </Link>
          </li>
        ))}
        {EMULATOR_IDS.map((emulator) => (
          <li key={emulator}>
            <Link href={emulatorPath(emulator)} className="rounded-full border border-border bg-card px-3 py-1 hover:bg-accent/60">
              {EMULATORS[emulator].name}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
