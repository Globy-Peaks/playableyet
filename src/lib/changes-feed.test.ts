import assert from "node:assert/strict";
import test from "node:test";
import { escapeXml, rssXml } from "./changes-feed";
import type { FeedItem } from "./feeds";

test("the feed escapes markup and only includes real from-to changes", () => {
  const item: FeedItem = {
    slug: "knack-2",
    name: "Knack & 2",
    emulator: "shadps4",
    titleId: "CUSA00001",
    at: "2026-10-16",
    status: "ingame",
    from: "nothing",
  };
  const xml = rssXml([item], "https://playableyet.vercel.app", "2026-10-17T06:43:39.568Z");
  assert.match(xml, /Knack &amp; 2: Nothing to Ingame on shadPS4/);
  assert.match(xml, /<link>https:\/\/playableyet.vercel.app\/games\/knack-2<\/link>/);
  assert.equal(xml.includes("<script"), false);
  assert.equal(escapeXml("<tag>"), "&lt;tag&gt;");
});
