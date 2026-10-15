export function AnyPs5Warning({ compact = false }: { compact?: boolean }) {
  return (
    <aside className="rounded-xl border border-chart-4/40 bg-chart-4/10 p-4 text-sm leading-6">
      <p className="font-medium text-foreground">AnyPS5 is a PS5 to native porting layer, not an emulator.</p>
      {compact ? null : (
        <p className="mt-2 text-muted-foreground">
          PlayableYet only links to the official project at{" "}
          <a className="text-foreground underline decoration-primary/60 underline-offset-4" href="https://github.com/boykopovar/AnyPS5">
            github.com/boykopovar/AnyPS5
          </a>{" "}
          and{" "}
          <a
            className="text-foreground underline decoration-primary/60 underline-offset-4"
            href="https://boykopovar.github.io/AnyPS5/"
          >
            boykopovar.github.io/AnyPS5
          </a>
          . Sites offering an AnyPS5 download, a PS5 BIOS, firmware, or keys are not official and are not linked here.
        </p>
      )}
    </aside>
  );
}
