import assert from "node:assert/strict";
import test from "node:test";
import { activeBanner, currentBanner, currentSupporters, readSupporters, sponsorHttpsUrl } from "./sponsor";
import {
  listedSponsorPackages,
  parseSponsorPackage,
  sponsorConfig,
  sponsorPackage,
  SPONSOR_PACKAGES,
} from "./sponsor-config";

test("the newsletter placement is off and the public packages are the two live ones", () => {
  assert.equal(sponsorConfig.showNewsletterSponsor, false);
  assert.equal(sponsorConfig.contactEmail, "hello@globypeaks.com");
  const listed = listedSponsorPackages();
  assert.deepEqual(
    listed.map((item) => item.id),
    ["supporter", "site_banner"],
  );
  assert.equal(listedSponsorPackages(true).some((item) => item.id === "newsletter_feature"), true);
  assert.equal(sponsorPackage("supporter").href, "https://buy.stripe.com/8x2cN5cUx1088oJ3kY0kE00");
  assert.equal(sponsorPackage("site_banner").href, "https://buy.stripe.com/bJe9AT3jX1087kF08M0kE01");
  assert.equal(sponsorPackage("newsletter_feature").href, "https://buy.stripe.com/5kQ3cv8EheQYawR2gU0kE02");
  assert.equal(SPONSOR_PACKAGES.every((item) => item.href.startsWith("https://buy.stripe.com/")), true);
});

test("package query accepts only the three ids", () => {
  assert.equal(parseSponsorPackage("supporter"), "supporter");
  assert.equal(parseSponsorPackage("site_banner"), "site_banner");
  assert.equal(parseSponsorPackage("newsletter_feature"), "newsletter_feature");
  assert.equal(parseSponsorPackage("banner"), null);
  assert.equal(parseSponsorPackage(""), null);
  assert.equal(parseSponsorPackage(undefined), null);
});

test("the committed banner and supporter list are empty", () => {
  assert.equal(currentBanner(), null);
  assert.deepEqual(currentSupporters(), []);
});

test("a banner renders only from a complete https sponsor", () => {
  assert.equal(activeBanner(null), null);
  assert.equal(activeBanner({ name: "", href: "", message: "" }), null);
  assert.equal(
    activeBanner({ name: "Example", href: "http://example.com", message: "A line." }),
    null,
  );
  assert.equal(
    activeBanner({ name: "Example", href: "javascript:alert(1)", message: "A line." }),
    null,
  );
  assert.deepEqual(activeBanner({ name: " Example ", href: "https://example.com/path", message: " A line. " }), {
    name: "Example",
    href: "https://example.com/path",
    message: "A line.",
  });
  assert.equal(sponsorHttpsUrl("https://user:pass@example.com"), null);
});

test("supporter names are trimmed and blank entries are dropped", () => {
  assert.deepEqual(readSupporters([" Ada ", { name: "Lin" }, { name: " " }, { name: "ada" }]), [
    { name: "Ada" },
    { name: "Lin" },
  ]);
  assert.deepEqual(readSupporters({}), []);
});
