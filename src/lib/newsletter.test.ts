import assert from "node:assert/strict";
import test from "node:test";
import { confirmRedirectPath, unsubscribeRedirectPath } from "./newsletter-actions";
import { handleConfirm, handleSignup, handleUnsubscribe, confirmMail, welcomeMail } from "./newsletter";
import { newsletterPendingPathname, parsePendingStore, type PendingSignup } from "./newsletter-pending";
import { allowHits, memoryRateBook, SIGNUP_IP_LIMIT, SIGNUP_IP_WINDOW_MS } from "./newsletter-rate";
import {
  GENERAL_SEGMENT_ID,
  PATCHVERDICT_SEGMENT_ID,
  SPONSOR_SEGMENT_ID,
  createContactBody,
  newsletterSegmentId,
  optOutSubscriber,
  saveSubscriber,
  type FetchLike,
} from "./newsletter-resend";
import { signUnsubscribeToken, unsubscribeExpiry, verifyUnsubscribeToken } from "./newsletter-token";
import { watchlistBlobPathname } from "./watchlist-blob";

const NOW = Date.parse("2026-10-19T12:00:00.000Z");
const SECRET = "newsletter-unsubscribe-secret";

function pending(overrides: Partial<PendingSignup> = {}): PendingSignup {
  return {
    email: "person@example.com",
    token: "confirm-token",
    consentAt: "2026-10-19T12:00:00.000Z",
    createdAt: "2026-10-19T12:00:00.000Z",
    expiresAt: "2026-10-21T12:00:00.000Z",
    sendAt: ["2026-10-19T12:00:00.000Z"],
    ...overrides,
  };
}

function memoryRows(initial: PendingSignup[] = []) {
  const state = { rows: initial.slice(), writes: 0 };
  return {
    state,
    read: async () => state.rows,
    write: async (rows: PendingSignup[]) => {
      state.rows = rows;
      state.writes += 1;
      return true;
    },
  };
}

test("honeypot submissions are acknowledged and not stored", async () => {
  const store = memoryRows();
  const result = await handleSignup({
    email: "person@example.com",
    consent: true,
    companyWebsite: "https://spam.example",
    ip: "203.0.113.8",
    nowMs: NOW,
    env: { NODE_ENV: "production", RESEND_API_KEY: "send", RESEND_FROM: "PlayableYet <hello@globypeaks.com>" },
    rate: memoryRateBook(),
    read: async () => {
      throw new Error("honeypot must not read pending signups");
    },
    write: store.write,
    send: async () => {
      throw new Error("honeypot must not send mail");
    },
    newToken: () => "unused",
  });
  assert.equal(result.status, 200);
  assert.match(result.body.message ?? "", /not subscribed/i);
  assert.equal(store.state.writes, 0);
});

test("consent is required before a pending signup is stored", async () => {
  const store = memoryRows();
  const missing = await handleSignup({
    email: "person@example.com",
    consent: false,
    companyWebsite: "",
    ip: "203.0.113.8",
    nowMs: NOW,
    env: { NODE_ENV: "test" },
    rate: memoryRateBook(),
    read: store.read,
    write: store.write,
    send: async () => "sent",
    newToken: () => "token",
  });
  assert.equal(missing.status, 400);
  const word = await handleSignup({
    email: "person@example.com",
    consent: "true",
    companyWebsite: "",
    ip: "203.0.113.9",
    nowMs: NOW,
    env: { NODE_ENV: "test" },
    rate: memoryRateBook(),
    read: store.read,
    write: store.write,
    send: async () => "sent",
    newToken: () => "token",
  });
  assert.equal(word.status, 400);
  assert.equal(store.state.writes, 0);
});

test("production without a sending key stores nothing", async () => {
  const result = await handleSignup({
    email: "person@example.com",
    consent: true,
    companyWebsite: "",
    ip: "203.0.113.8",
    nowMs: NOW,
    env: { NODE_ENV: "production" },
    rate: memoryRateBook(),
    read: async () => {
      throw new Error("unavailable signup must not read");
    },
    write: async () => {
      throw new Error("unavailable signup must not write");
    },
    send: async () => "sent",
    newToken: () => "token",
  });
  assert.equal(result.status, 503);
  assert.match(result.body.error ?? "", /Nothing was stored/);
});

test("a pending signup is not created as a Resend contact", async () => {
  const store = memoryRows();
  let sent = 0;
  const result = await handleSignup({
    email: " Person@Example.com ",
    consent: true,
    companyWebsite: "",
    ip: "203.0.113.8",
    nowMs: NOW,
    env: { NODE_ENV: "test" },
    rate: memoryRateBook(),
    read: store.read,
    write: store.write,
    send: async () => {
      sent += 1;
      return "sent";
    },
    newToken: () => "pending-token",
  });
  assert.equal(result.status, 200);
  assert.equal(result.body.devConfirmPath, "/api/newsletter/confirm?token=pending-token");
  assert.equal(sent, 0);
  assert.equal(store.state.rows.length, 1);
  assert.equal(store.state.rows[0]?.email, "person@example.com");
  assert.equal(store.state.rows[0]?.token, "pending-token");
});

test("an address is limited to five signup attempts per hour from one network", () => {
  let hits: number[] = [];
  for (let attempt = 0; attempt < SIGNUP_IP_LIMIT; attempt += 1) {
    const result = allowHits(NOW + attempt, hits, SIGNUP_IP_LIMIT, SIGNUP_IP_WINDOW_MS);
    assert.equal(result.allowed, true);
    hits = result.hits;
  }
  const blocked = allowHits(NOW + SIGNUP_IP_LIMIT, hits, SIGNUP_IP_LIMIT, SIGNUP_IP_WINDOW_MS);
  assert.equal(blocked.allowed, false);
  const later = allowHits(NOW + SIGNUP_IP_WINDOW_MS + SIGNUP_IP_LIMIT, hits, SIGNUP_IP_LIMIT, SIGNUP_IP_WINDOW_MS);
  assert.equal(later.allowed, true);
});

test("confirmation mail is capped per address and a quick retry does not send again", async () => {
  const store = memoryRows();
  const rate = memoryRateBook();
  let sent = 0;
  const env = { NODE_ENV: "test", RESEND_API_KEY: "send", RESEND_FROM: "PlayableYet <hello@globypeaks.com>" };
  async function attempt(nowMs: number) {
    return handleSignup({
      email: "person@example.com",
      consent: true,
      companyWebsite: "",
      ip: "203.0.113.10",
      nowMs,
      env,
      rate,
      read: store.read,
      write: store.write,
      send: async () => {
        sent += 1;
        return "sent";
      },
      newToken: () => `token-${sent + 1}`,
    });
  }
  assert.equal((await attempt(NOW)).status, 200);
  const cooled = await attempt(NOW + 10_000);
  assert.equal(cooled.status, 200);
  assert.equal(sent, 1);
  assert.equal(store.state.rows[0]?.token, "token-1");
  assert.equal((await attempt(NOW + 61_000)).status, 200);
  assert.equal((await attempt(NOW + 122_000)).status, 200);
  const blocked = await attempt(NOW + 183_000);
  assert.equal(blocked.status, 429);
  assert.equal(sent, 3);
});

test("unsubscribe tokens round-trip and reject tampering or expiry", () => {
  const token = signUnsubscribeToken("person@example.com", unsubscribeExpiry(NOW), SECRET);
  assert.equal(verifyUnsubscribeToken(token, SECRET, NOW), "person@example.com");
  assert.equal(verifyUnsubscribeToken(token, "other-secret", NOW), null);
  assert.equal(verifyUnsubscribeToken(`${token}x`, SECRET, NOW), null);
  const expired = signUnsubscribeToken("person@example.com", Math.floor(NOW / 1000) - 5, SECRET);
  assert.equal(verifyUnsubscribeToken(expired, SECRET, NOW), null);
});

test("confirmation email has the confirm link and no unsubscribe token", () => {
  const mail = confirmMail("https://playableyet.vercel.app", "abc");
  assert.match(mail.html, /api\/newsletter\/confirm\?token=abc/);
  assert.equal(mail.html.toLowerCase().includes("unsubscribe"), false);
  assert.equal(mail.text.toLowerCase().includes("unsubscribe"), false);
  const welcome = welcomeMail("https://playableyet.vercel.app/api/newsletter/unsubscribe?token=signed");
  assert.match(welcome.text, /Unsubscribe: https:\/\/playableyet.vercel.app\/api\/newsletter\/unsubscribe\?token=signed/);
  assert.equal(welcome.headers["List-Unsubscribe-Post"], "List-Unsubscribe=One-Click");
  assert.match(welcome.headers["List-Unsubscribe"], /^<https:\/\/playableyet.vercel.app\/api\/newsletter\/unsubscribe\?token=signed>$/);
});

test("confirm stores a contact and removes the pending request", async () => {
  const store = memoryRows([pending()]);
  let saved = 0;
  const outcome = await handleConfirm({
    token: "confirm-token",
    nowMs: NOW,
    site: "https://playableyet.vercel.app",
    env: { NEWSLETTER_UNSUBSCRIBE_SECRET: SECRET, RESEND_CONTACTS_API_KEY: "full" },
    read: store.read,
    write: store.write,
    saveContact: async (row) => {
      saved += 1;
      assert.equal(row.email, "person@example.com");
      return "saved";
    },
    sendWelcome: async (_row, unsubUrl) => {
      assert.match(unsubUrl, /\/api\/newsletter\/unsubscribe\?token=/);
      return "sent";
    },
  });
  assert.equal(outcome.status, "confirmed");
  assert.equal(saved, 1);
  assert.deepEqual(store.state.rows, []);
});

test("confirm without a contacts key or unsubscribe secret does not claim a subscription", async () => {
  const waiting = memoryRows([pending()]);
  let saved = 0;
  const storage = await handleConfirm({
    token: "confirm-token",
    nowMs: NOW,
    site: "https://playableyet.vercel.app",
    env: { NEWSLETTER_UNSUBSCRIBE_SECRET: SECRET },
    read: waiting.read,
    write: waiting.write,
    saveContact: async () => {
      saved += 1;
      return "unconfigured";
    },
    sendWelcome: async () => "sent",
  });
  assert.equal(storage.status, "storage");
  assert.equal(saved, 1);
  assert.equal(waiting.state.rows.length, 1);

  const secretless = memoryRows([pending()]);
  const blocked = await handleConfirm({
    token: "confirm-token",
    nowMs: NOW,
    site: "https://playableyet.vercel.app",
    env: { RESEND_CONTACTS_API_KEY: "full" },
    read: secretless.read,
    write: secretless.write,
    saveContact: async () => {
      throw new Error("missing unsubscribe secret must not create a contact");
    },
    sendWelcome: async () => "sent",
  });
  assert.equal(blocked.status, "secret");
  assert.equal(secretless.state.writes, 0);
});

test("contact create opts into the topic, stamps consent, and refuses other newsletters' segments", async () => {
  assert.equal(newsletterSegmentId({ RESEND_NEWSLETTER_SEGMENT_ID: PATCHVERDICT_SEGMENT_ID }), GENERAL_SEGMENT_ID);
  assert.equal(newsletterSegmentId({ RESEND_NEWSLETTER_SEGMENT_ID: SPONSOR_SEGMENT_ID }), GENERAL_SEGMENT_ID);
  assert.equal(
    newsletterSegmentId({ RESEND_NEWSLETTER_SEGMENT_ID: "11111111-1111-4111-8111-111111111111" }),
    "11111111-1111-4111-8111-111111111111",
  );
  const body = createContactBody("person@example.com", "2026-10-19T12:00:00.000Z", {
    RESEND_NEWSLETTER_SEGMENT_ID: PATCHVERDICT_SEGMENT_ID,
  });
  assert.equal(body.properties.source, "playableyet");
  assert.equal(body.properties.playableyet_consent_at, "2026-10-19T12:00:00.000Z");
  assert.equal(body.topics[0]?.subscription, "opt_in");
  assert.equal(body.segments[0]?.id, GENERAL_SEGMENT_ID);
  assert.equal(body.unsubscribed, false);

  const calls: { url: string; method: string; body: string; authorization: string }[] = [];
  const fetchImpl: FetchLike = async (url, init) => {
    const headers = new Headers(init.headers);
    calls.push({
      url: String(url),
      method: init.method ?? "",
      body: String(init.body ?? ""),
      authorization: headers.get("authorization") ?? "",
    });
    if (init.method === "POST" && url === "https://api.resend.com/contacts") {
      return new Response("exists", { status: 409 });
    }
    return new Response("{}", { status: 200 });
  };
  const saved = await saveSubscriber({
    email: "person@example.com",
    consentAt: "2026-10-19T12:00:00.000Z",
    env: { RESEND_CONTACTS_API_KEY: "contacts-key", RESEND_NEWSLETTER_SEGMENT_ID: SPONSOR_SEGMENT_ID },
    idempotencyKey: "newsletter-contact/confirm-token",
    fetchImpl,
  });
  assert.equal(saved, "saved");
  assert.equal(calls[0]?.authorization, "Bearer contacts-key");
  const created = JSON.parse(calls[0]?.body ?? "{}") as { segments?: { id: string }[] };
  assert.equal(created.segments?.[0]?.id, GENERAL_SEGMENT_ID);
  const patched = JSON.parse(calls[1]?.body ?? "{}") as { unsubscribed?: boolean; properties?: { source?: string } };
  assert.equal(Object.hasOwn(patched, "unsubscribed"), false);
  assert.equal(patched.properties?.source, "playableyet");
  const topics = JSON.parse(calls[2]?.body ?? "[]") as { subscription?: string }[];
  assert.equal(topics[0]?.subscription, "opt_in");
  assert.equal(calls.some((call) => call.url.includes(PATCHVERDICT_SEGMENT_ID)), false);
  assert.equal(calls.some((call) => call.url.includes(SPONSOR_SEGMENT_ID)), false);
  assert.match(calls[3]?.url ?? "", new RegExp(`/segments/${GENERAL_SEGMENT_ID}$`));
});

test("unsubscribe opts out of the topic and does not set a global unsubscribe", async () => {
  const calls: { url: string; body: string }[] = [];
  const fetchImpl: FetchLike = async (url, init) => {
    calls.push({ url: String(url), body: String(init.body ?? "") });
    return new Response("{}", { status: 200 });
  };
  const done = await optOutSubscriber({
    email: "person@example.com",
    env: { RESEND_CONTACTS_API_KEY: "contacts-key" },
    fetchImpl,
  });
  assert.equal(done, "done");
  assert.match(calls[0]?.url ?? "", /\/contacts\/person%40example.com\/topics$/);
  assert.equal(calls[0]?.body.includes("unsubscribed"), false);
  const body = JSON.parse(calls[0]?.body ?? "[]") as { subscription?: string }[];
  assert.equal(body[0]?.subscription, "opt_out");

  const missingKey = await optOutSubscriber({
    email: "person@example.com",
    env: {},
    fetchImpl: async () => {
      throw new Error("missing contacts key must not call Resend");
    },
  });
  assert.equal(missingKey, "unconfigured");

  const token = signUnsubscribeToken("person@example.com", unsubscribeExpiry(NOW), SECRET);
  let opted = "";
  const outcome = await handleUnsubscribe({
    token,
    nowMs: NOW,
    env: { NEWSLETTER_UNSUBSCRIBE_SECRET: SECRET },
    optOut: async (email) => {
      opted = email;
      return "done";
    },
  });
  assert.equal(outcome, "done");
  assert.equal(opted, "person@example.com");
  const ignored = await handleUnsubscribe({
    token: "not-a-token",
    nowMs: NOW,
    env: { NEWSLETTER_UNSUBSCRIBE_SECRET: SECRET },
    optOut: async () => {
      throw new Error("invalid token must not opt out");
    },
  });
  assert.equal(ignored, "missing");
});

test("pending confirmation storage is separate from the watchlist and the public catalog", () => {
  const secret = "blob-token-value";
  const pathname = newsletterPendingPathname(secret);
  assert.match(pathname ?? "", /^playableyet\/newsletter\/[a-f0-9]{64}\.json$/);
  assert.equal(pathname?.includes(secret), false);
  assert.notEqual(pathname, watchlistBlobPathname({ BLOB_READ_WRITE_TOKEN: secret }));
  assert.equal(newsletterPendingPathname("  "), null);
  assert.throws(() => parsePendingStore("nope"), /confirmation list/);
  assert.deepEqual(parsePendingStore(JSON.stringify({ pending: [pending(), { email: 1 }] })), [pending()]);
});

test("result paths keep a failed welcome unsubscribe link and hide it after a normal confirm", () => {
  assert.equal(confirmRedirectPath({ status: "confirmed" }), "/newsletter/confirmed");
  assert.equal(confirmRedirectPath({ status: "storage" }), "/newsletter/confirmed?status=storage");
  assert.equal(
    confirmRedirectPath({ status: "mail", token: "a.b" }),
    "/newsletter/confirmed?status=mail&unsub=a.b",
  );
  assert.equal(unsubscribeRedirectPath("done"), "/newsletter/unsubscribed");
  assert.equal(unsubscribeRedirectPath("missing"), "/newsletter/unsubscribed?status=missing");
});
