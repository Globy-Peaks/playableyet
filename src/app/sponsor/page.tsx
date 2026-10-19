import type { Metadata } from "next";
import { buttonVariants } from "@/components/ui/button";
import { currentBanner, currentSupporters } from "@/lib/sponsor";
import { listedSponsorPackages, sponsorConfig } from "@/lib/sponsor-config";
import { cn } from "cn";

export const metadata: Metadata = {
  title: "Sponsor",
  description:
    "Paid support for PlayableYet: a name on the supporters list, or one reviewed banner on the home page and game pages. Questions go to hello@globypeaks.com.",
  alternates: { canonical: "/sponsor" },
  openGraph: {
    title: "Sponsor · PlayableYet",
    description:
      "Supporter names and a reviewed site banner. Stripe charges the card. PlayableYet does not publish traffic numbers.",
    url: "/sponsor",
  },
};

export default function SponsorPage() {
  const packages = listedSponsorPackages();
  const supporters = currentSupporters();
  const banner = currentBanner();
  const contact = `mailto:${sponsorConfig.contactEmail}`;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-8 sm:py-12">
      <div className="space-y-3">
        <p className="font-mono text-xs tracking-[0.18em] text-primary uppercase">Support the index</p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Sponsor PlayableYet</h1>
        <p className="text-sm leading-6 text-muted-foreground">
          PlayableYet is a free index of public PlayStation compatibility reports. It does not host games. These
          payments keep the site online. Prices are in US dollars. Stripe charges the card, and PlayableYet does not
          see the card number. Questions go to{" "}
          <a className="text-foreground underline decoration-primary/60 underline-offset-4" href={contact}>
            {sponsorConfig.contactEmail}
          </a>
          .
        </p>
      </div>

      <div className="grid gap-4">
        {packages.map((item) => (
          <article key={item.id} className="space-y-3 rounded-xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-lg font-semibold tracking-tight">{item.name}</h2>
              <p className="font-mono text-sm text-muted-foreground">{item.price}</p>
            </div>
            <p className="text-sm leading-6 text-muted-foreground">{item.summary}</p>
            {item.id === "site_banner" ? (
              <p className="text-sm leading-6 text-muted-foreground">
                {banner
                  ? `A banner for ${banner.name} is configured now. Only one runs at a time. If you pay while that one is still up, write before expecting yours to replace it. The payment is refunded in full if yours is not approved.`
                  : "The banner slot is open. Nothing is shown on the home page or game pages until a sponsor is reviewed and added to the site config."}
              </p>
            ) : null}
            <a href={item.href} className={cn(buttonVariants({ size: "lg" }), "h-10 px-4")}>
              Continue to Stripe — {item.price}
            </a>
          </article>
        ))}
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold tracking-tight">Thanks to our supporters</h2>
        {supporters.length === 0 ? (
          <p className="text-sm leading-6 text-muted-foreground">
            No names yet. After a Supporter payment, email{" "}
            <a className="text-foreground underline decoration-primary/60 underline-offset-4" href={contact}>
              {sponsorConfig.contactEmail}
            </a>{" "}
            with the name to show here, or to ask for a name to be removed.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {supporters.map((supporter) => (
              <li key={supporter.name} className="rounded-full border border-border bg-card px-3 py-1 text-sm">
                {supporter.name}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
