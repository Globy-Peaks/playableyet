import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { parseSponsorPackage, sponsorConfig, sponsorPackage, type SponsorPackageId } from "@/lib/sponsor-config";

export const metadata: Metadata = {
  title: "Payment received",
  description: "What happens after a PlayableYet sponsorship payment.",
  robots: { index: false, follow: false },
};

export default function ThanksPage({ searchParams }: PageProps<"/sponsor/thanks">) {
  return (
    <Suspense fallback={<Shell title="Checking that payment…" body="One moment." />}>
      <Thanks searchParams={searchParams} />
    </Suspense>
  );
}

async function Thanks({ searchParams }: { searchParams: Promise<{ package?: string }> }) {
  const { package: packageId } = await searchParams;
  const parsed = parseSponsorPackage(packageId);
  const copy = thanksCopy(parsed);
  const contact = `mailto:${sponsorConfig.contactEmail}`;
  return (
    <Shell title={copy.title} body={copy.body}>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        Write to{" "}
        <a className="text-foreground underline decoration-primary/60 underline-offset-4" href={contact}>
          {sponsorConfig.contactEmail}
        </a>
        . Include the email on the Stripe receipt
        {copy.ask ? ` and ${copy.ask}` : ""}.
      </p>
    </Shell>
  );
}

function thanksCopy(id: SponsorPackageId | null): { title: string; body: string; ask: string } {
  if (id === "supporter") {
    const item = sponsorPackage(id);
    return {
      title: "Supporter payment received",
      body: `${item.name} is ${item.price}. This does not include a banner. The name is added to the list on the sponsor page after you send it. You can ask for the name to be changed or removed.`,
      ask: "the name to show",
    };
  }
  if (id === "site_banner") {
    const item = sponsorPackage(id);
    return {
      title: "Banner payment received",
      body: `${item.name} is ${item.price}. One banner runs at a time, labeled Sponsored, on the home page and game pages. Send the name, one sentence, and an https link. The banner goes live only after it is reviewed and approved. If it is not approved, the payment is refunded in full.`,
      ask: "the name, sentence, and https link",
    };
  }
  if (id === "newsletter_feature") {
    const item = sponsorPackage(id);
    return {
      title: "Newsletter payment received",
      body: `${item.name} is ${item.price}. This is one mention in a single digest issue, not a subscription. Send the text and the https link. It is included only after review and approval. If it is not approved, the payment is refunded. This page does not promise that an issue is scheduled.`,
      ask: "the text and https link for that issue",
    };
  }
  return {
    title: "Payment received",
    body: "If you just paid for a PlayableYet sponsorship, the Stripe receipt is the record of the charge. This page does not know which package was bought unless the link includes it. Nothing goes on the site until the details are confirmed.",
    ask: "which package you bought",
  };
}

function Shell({ title, body, children }: { title: string; body: string; children?: ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-xl px-4 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{body}</p>
      {children}
      <Link href="/sponsor" className="mt-6 inline-block text-sm underline decoration-primary/60 underline-offset-4">
        Back to sponsorships
      </Link>
    </main>
  );
}
