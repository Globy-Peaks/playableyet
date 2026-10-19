/**
 * Public sponsor packages. Payment buttons are Stripe Payment Links.
 * No secret key and no Stripe SDK. The newsletter placement stays off
 * until a digest issue is actually being sent.
 */
export const sponsorConfig = {
  showNewsletterSponsor: false,
  contactEmail: "hello@globypeaks.com",
} as const;

export const SPONSOR_PACKAGE_IDS = ["supporter", "site_banner", "newsletter_feature"] as const;

export type SponsorPackageId = (typeof SPONSOR_PACKAGE_IDS)[number];

export type SponsorPackage = {
  id: SponsorPackageId;
  name: string;
  price: string;
  href: string;
  summary: string;
};

export const SPONSOR_PACKAGES: readonly SponsorPackage[] = [
  {
    id: "supporter",
    name: "Supporter",
    price: "$5/mo",
    href: "https://buy.stripe.com/8x2cN5cUx1088oJ3kY0kE00",
    summary:
      "Your name on the supporters list on this page. No banner and no other placement. Cancel any time from the Stripe receipt.",
  },
  {
    id: "site_banner",
    name: "Site banner",
    price: "$49/mo",
    href: "https://buy.stripe.com/bJe9AT3jX1087kF08M0kE01",
    summary:
      "One sponsor at a time. A short line and a link, labeled Sponsored, on the home page and on game pages. Every banner is reviewed before it goes live. If it is not approved, the payment is refunded in full.",
  },
  {
    id: "newsletter_feature",
    name: "Newsletter feature",
    price: "$25 per issue",
    href: "https://buy.stripe.com/5kQ3cv8EheQYawR2gU0kE02",
    summary:
      "One reviewed mention in a single weekly digest issue. You send the text and the link. This is not a subscription, and it does not promise a number of readers. If the mention is not approved, the payment is refunded.",
  },
];

export function listedSponsorPackages(showNewsletterSponsor: boolean = sponsorConfig.showNewsletterSponsor): SponsorPackage[] {
  return SPONSOR_PACKAGES.filter((item) => item.id !== "newsletter_feature" || showNewsletterSponsor);
}

export function parseSponsorPackage(value: string | undefined | null): SponsorPackageId | null {
  if (!value) return null;
  return SPONSOR_PACKAGE_IDS.find((id) => id === value) ?? null;
}

export function sponsorPackage(id: SponsorPackageId): SponsorPackage {
  const found = SPONSOR_PACKAGES.find((item) => item.id === id);
  if (!found) throw new Error(`Unknown sponsor package ${id}`);
  return found;
}
