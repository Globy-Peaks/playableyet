import { currentBanner } from "@/lib/sponsor";

export function SponsoredBanner() {
  const banner = currentBanner();
  if (!banner) return null;
  return (
    <aside aria-label="Sponsored" className="rounded-xl border border-border bg-card px-4 py-3 text-sm">
      <p className="font-mono text-[11px] tracking-[0.16em] text-muted-foreground uppercase">Sponsored</p>
      <p className="mt-1 leading-6">
        <a
          href={banner.href}
          rel="sponsored noopener"
          target="_blank"
          className="font-medium text-foreground underline decoration-primary/60 underline-offset-4"
        >
          {banner.name}
        </a>
        <span className="text-muted-foreground"> — {banner.message}</span>
      </p>
    </aside>
  );
}
