import assert from "node:assert/strict";
import test from "node:test";
import { formatEditionList, titleEditionLabel } from "./title-edition";

test("PS3 disc and digital prefixes use the standard region letter", () => {
  assert.equal(titleEditionLabel("BLUS30166"), "US disc");
  assert.equal(titleEditionLabel("bles00316"), "EU disc");
  assert.equal(titleEditionLabel("BLJM61056"), "Japan disc");
  assert.equal(titleEditionLabel("BCUS98174"), "US disc");
  assert.equal(titleEditionLabel("BCES01893"), "EU disc");
  assert.equal(titleEditionLabel("NPUB30393"), "US digital (PSN)");
  assert.equal(titleEditionLabel("NPUA80008"), "US digital (PSN)");
  assert.equal(titleEditionLabel("NPEB00772"), "EU digital (PSN)");
  assert.equal(titleEditionLabel("NPJB00431"), "Japan digital (PSN)");
  assert.equal(titleEditionLabel("NPHB00001"), "Asia digital (PSN)");
  assert.equal(titleEditionLabel("BLUD00001"), "US disc");
});

test("CUSA and PPSA stay unknown unless the catalog names a region", () => {
  assert.equal(titleEditionLabel("CUSA00038"), "unknown");
  assert.equal(titleEditionLabel("PPSA01284"), "unknown");
  assert.equal(titleEditionLabel("CUSA00038", "EP"), "EU, format unknown");
  assert.equal(titleEditionLabel("PPSA01284", "UP"), "US, format unknown");
  assert.equal(titleEditionLabel("PPSA01284", "JP"), "Japan, format unknown");
  assert.equal(titleEditionLabel("CUSA00038", "UB"), "US, format unknown");
  assert.equal(titleEditionLabel("CUSA00038", "ZZ"), "unknown");
  assert.equal(titleEditionLabel("CUSA00038", "IP"), "unknown");
  assert.equal(titleEditionLabel("CUSA00038", "  "), "unknown");
});

test("a known disc prefix is not replaced by a catalog region", () => {
  assert.equal(titleEditionLabel("BLUS30166", "EP"), "US disc");
});

test("prefixes that do not encode a medium or region stay unknown", () => {
  assert.equal(titleEditionLabel("BREW00001"), "unknown");
  assert.equal(titleEditionLabel("NPXS20000"), "unknown");
  assert.equal(titleEditionLabel("not-an-id"), "unknown");
  assert.equal(titleEditionLabel("ELJM30022"), "Japan, format unknown");
  assert.equal(titleEditionLabel("ECAS00006"), "Asia, format unknown");
  assert.equal(titleEditionLabel("PCJS50002"), "Japan disc");
});

test("edition lists keep each title id with its label", () => {
  assert.equal(
    formatEditionList([
      { id: "BLES00316" },
      { id: "CUSA00038", region: "UP" },
    ]),
    "BLES00316 (EU disc), CUSA00038 (US, format unknown)",
  );
});
