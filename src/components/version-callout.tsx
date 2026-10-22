import { versionDisagreementSentence, versionDisagreements } from "@/lib/version-split";
import type { Game } from "@/lib/types";

export function VersionCallout({ game }: { game: Game }) {
  const items = versionDisagreements(game);
  if (items.length === 0) return null;
  return (
    <aside aria-label="Versions that disagree" className="rounded-xl border border-primary/40 bg-primary/10 p-4 text-sm leading-6">
      <h2 className="font-medium text-foreground">Check your version</h2>
      <p className="mt-2 text-muted-foreground">
        These versions do not share a status. The summary above follows the furthest report.
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-4 text-muted-foreground">
        {items.map((item) => (
          <li key={item.emulator}>{versionDisagreementSentence(item)}</li>
        ))}
      </ul>
    </aside>
  );
}
