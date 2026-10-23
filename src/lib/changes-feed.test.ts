import assert from "node:assert/strict";
import test from "node:test";
import { escapeXml, rssXml } from "./changes-feed";
import type { FeedItem } from "./feeds";

test("the feed escapes markup and only includes real from-to changes", () => {
  const item: FeedItem = {
    slug: "knack-2",
    name: "Knack & 2",
    emulator: "shadps4",
    editions: [
      { id: "CUSA00001", region: "UP" },
      { id: "CUSA00002", region: "EP" },
    ],
    at: "2026-10-16",
    status: "ingame",
    from: "nothing",
  };
  const xml = rssXml([item], "https://playableyet.vercel.app", "2026-10-17T06:43:39.568Z");
  assert.match(xml, /Knack &amp; 2: Nothing to Ingame on shadPS4/);
  assert.match(xml, /Editions: CUSA00001 \(US, format unknown\), CUSA00002 \(EU, format unknown\)/);
  assert.match(xml, /<guid isPermaLink="false">knack-2:shadps4:CUSA00001,CUSA00002:2026-10-16:nothing:ingame<\/guid>/);
  assert.equal(xml.match(/<item>/g)?.length, 1);
  assert.match(xml, /<link>https:\/\/playableyet.vercel.app\/games\/knack-2<\/link>/);
  assert.equal(xml.includes("<script"), false);
  assert.equal(escapeXml("<tag>"), "&lt;tag&gt;");
  assert.match(xml, /<pubDate>Fri, 16 Oct 2026 12:00:00 GMT<\/pubDate>/);
  assert.match(xml, /<lastBuildDate>Sat, 17 Oct 2026 06:43:39 GMT<\/lastBuildDate>/);
});

test("a change recorded on the sync day uses that sync time", () => {
  const generatedAt = "2026-10-21T06:43:00.000Z";
  const item: FeedItem = {
    slug: "grand-theft-auto-v",
    name: "Grand Theft Auto V",
    emulator: "shadps4",
    editions: [{ id: "CUSA00411" }],
    at: "2026-10-21",
    status: "ingame",
    from: "menus",
  };
  const xml = rssXml([item], "https://playableyet.vercel.app", generatedAt);
  const syncTime = new Date(generatedAt).toUTCString();
  assert.match(xml, new RegExp(`<lastBuildDate>${syncTime}</lastBuildDate>`));
  assert.match(xml, new RegExp(`<pubDate>${syncTime}</pubDate>`));
  const older = rssXml([{ ...item, at: "2026-10-18" }], "https://playableyet.vercel.app", generatedAt);
  assert.match(older, /<pubDate>Sun, 18 Oct 2026 12:00:00 GMT<\/pubDate>/);
  const pub = older.match(/<pubDate>([^<]+)<\/pubDate>/)?.[1] ?? "";
  const built = older.match(/<lastBuildDate>([^<]+)<\/lastBuildDate>/)?.[1] ?? "";
  assert.ok(Date.parse(pub) <= Date.parse(built));
});
