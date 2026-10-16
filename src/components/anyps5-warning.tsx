import {
  ANYPS5_OFFICIAL_REPO,
  ANYPS5_OFFICIAL_SITE,
  ANYPS5_ROADMAP_REPO,
  ANYPS5_ROADMAP_SITE,
} from "@/lib/sync/anyps5";

export function AnyPs5Warning({ compact = false }: { compact?: boolean }) {
  return (
    <aside className="rounded-xl border border-chart-4/40 bg-chart-4/10 p-4 text-sm leading-6">
      <p className="font-medium text-foreground">AnyPS5 is a PS5 to native porting layer, not an emulator.</p>
      {compact ? null : (
        <p className="mt-2 text-muted-foreground">
          The official project is{" "}
          <a className="text-foreground underline decoration-primary/60 underline-offset-4" href={ANYPS5_OFFICIAL_REPO}>
            github.com/boykopovar/AnyPS5
          </a>{" "}
          and{" "}
          <a className="text-foreground underline decoration-primary/60 underline-offset-4" href={ANYPS5_OFFICIAL_SITE}>
            boykopovar.github.io/AnyPS5
          </a>
          . Stage and blocker details come from the community roadmap at{" "}
          <a className="text-foreground underline decoration-primary/60 underline-offset-4" href={ANYPS5_ROADMAP_SITE}>
            alxcbtw.github.io/anyps5-roadmap
          </a>{" "}
          (
          <a className="text-foreground underline decoration-primary/60 underline-offset-4" href={ANYPS5_ROADMAP_REPO}>
            AlxcBTW/anyps5-roadmap
          </a>
          ). Sites offering an AnyPS5 download, a PS5 BIOS, firmware, or keys are not official and are not linked here.
        </p>
      )}
    </aside>
  );
}
