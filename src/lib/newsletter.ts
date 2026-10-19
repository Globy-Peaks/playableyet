import { isEmail, normalizeEmail } from "@/lib/watchlist";
import type { PendingSignup } from "@/lib/newsletter-pending";
import {
  SIGNUP_COOLDOWN_MS,
  SIGNUP_EMAIL_LIMIT,
  SIGNUP_EMAIL_WINDOW_MS,
  SIGNUP_IP_LIMIT,
  SIGNUP_IP_WINDOW_MS,
  type RateBook,
} from "@/lib/newsletter-rate";
import type { NewsletterEnv } from "@/lib/newsletter-resend";
import { signUnsubscribeToken, unsubscribeExpiry, verifyUnsubscribeToken } from "@/lib/newsletter-token";

export const CONFIRM_TTL_MS = 48 * 60 * 60 * 1000;
const PENDING_CAP = 500;

const SENT_MESSAGE = "Check your inbox and open the confirmation link. You are not subscribed until you do.";
const SAVED_MESSAGE = "Saved. Email delivery is not configured in this environment, so no message was sent.";
const UNAVAILABLE = "The weekly digest is not available right now. Nothing was stored.";

export type NewsletterHttp = {
  status: number;
  body: { message?: string; error?: string; devConfirmPath?: string };
};

export type ConfirmOutcome =
  | { status: "confirmed" }
  | { status: "missing" }
  | { status: "storage" }
  | { status: "secret" }
  | { status: "mail"; token: string };

export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function confirmMail(site: string, token: string) {
  const url = `${site}/api/newsletter/confirm?token=${encodeURIComponent(token)}`;
  const html = `<p>Confirm that you want the weekly PlayableYet digest of titles newly marked Playable across PS3, PS4, and PS5 emulators.</p><p><a href="${escapeHtml(url)}">Confirm this subscription</a></p><p>If you did not ask for this, ignore the message. You are not subscribed until you open the link.</p>`;
  const text = `Confirm your PlayableYet weekly digest:\n${url}\n\nIf you did not ask for this, ignore the message. You are not subscribed until you open the link.`;
  return { subject: "Confirm your PlayableYet weekly digest", html, text, url };
}

export function welcomeMail(unsubUrl: string) {
  const html = `<p>You're confirmed for the weekly PlayableYet digest of titles newly marked Playable across PS3, PS4, and PS5 emulators.</p><p><a href="${escapeHtml(unsubUrl)}">Unsubscribe</a></p>`;
  const text = `You're confirmed for the weekly PlayableYet digest of titles newly marked Playable across PS3, PS4, and PS5 emulators.\n\nUnsubscribe: ${unsubUrl}`;
  return {
    subject: "You're on the PlayableYet weekly digest",
    html,
    text,
    headers: {
      "List-Unsubscribe": `<${unsubUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  };
}

export function compactPending(rows: PendingSignup[], nowMs: number, keepEmail?: string): PendingSignup[] {
  const live = rows.filter((row) => Date.parse(row.expiresAt) > nowMs);
  if (live.length <= PENDING_CAP) return live;
  const kept = keepEmail ? live.filter((row) => row.email === keepEmail) : [];
  const rest = live.filter((row) => row.email !== keepEmail);
  rest.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return [...kept, ...rest].slice(0, PENDING_CAP);
}

function recentSends(row: PendingSignup, nowMs: number): string[] {
  return row.sendAt.filter((at) => {
    const stamp = Date.parse(at);
    return Number.isFinite(stamp) && nowMs >= stamp && nowMs - stamp < SIGNUP_EMAIL_WINDOW_MS;
  });
}

function sendingConfigured(env: NewsletterEnv): boolean {
  return Boolean(env.RESEND_API_KEY?.trim() && env.RESEND_FROM?.trim());
}

export async function handleSignup(input: {
  email: unknown;
  consent: unknown;
  companyWebsite: unknown;
  ip: string;
  nowMs: number;
  env: NewsletterEnv;
  rate: RateBook;
  read: () => Promise<PendingSignup[]>;
  write: (rows: PendingSignup[]) => Promise<boolean>;
  send: (row: PendingSignup) => Promise<"sent" | "failed">;
  newToken: () => string;
}): Promise<NewsletterHttp> {
  if (typeof input.companyWebsite === "string" && input.companyWebsite.trim()) {
    return { status: 200, body: { message: SENT_MESSAGE } };
  }
  if (input.consent !== true) {
    return { status: 400, body: { error: "Confirm that you want the weekly digest." } };
  }
  const email = typeof input.email === "string" ? normalizeEmail(input.email) : "";
  if (!isEmail(email)) {
    return { status: 400, body: { error: "Enter a valid email address." } };
  }
  const ipLimit = input.rate.take(`ip:${input.ip || "unknown"}`, input.nowMs, SIGNUP_IP_LIMIT, SIGNUP_IP_WINDOW_MS);
  if (!ipLimit.allowed) {
    return { status: 429, body: { error: "Too many signup attempts from this network. Wait and try again." } };
  }

  const configured = sendingConfigured(input.env);
  if (!configured && input.env.NODE_ENV === "production") {
    return { status: 503, body: { error: UNAVAILABLE } };
  }

  const rows = await input.read();
  const existing = rows.find((row) => row.email === email && Date.parse(row.expiresAt) > input.nowMs);
  if (existing) {
    const last = Date.parse(existing.sendAt.at(-1) ?? "");
    if (Number.isFinite(last) && input.nowMs - last < SIGNUP_COOLDOWN_MS) {
      return quietSuccess(configured, existing.token);
    }
    if (recentSends(existing, input.nowMs).length >= SIGNUP_EMAIL_LIMIT) {
      return { status: 429, body: { error: "Too many confirmation emails for that address. Wait an hour and try again." } };
    }
  }

  const token = input.newToken();
  const stamp = new Date(input.nowMs).toISOString();
  const previousSends = existing ? recentSends(existing, input.nowMs) : [];
  const created: PendingSignup = {
    email,
    token,
    consentAt: stamp,
    createdAt: existing?.createdAt ?? stamp,
    expiresAt: new Date(input.nowMs + CONFIRM_TTL_MS).toISOString(),
    sendAt: [...previousSends, stamp],
  };
  const next = compactPending(
    [...rows.filter((row) => row.email !== email), created],
    input.nowMs,
    email,
  );
  const stored = await input.write(next);
  if (!stored) return { status: 503, body: { error: UNAVAILABLE } };
  if (!configured) return quietSuccess(false, token);

  try {
    const sent = await input.send(created);
    if (sent === "failed") {
      return {
        status: 502,
        body: { error: "The request was saved, but the confirmation email could not be sent. Try again in a minute." },
      };
    }
  } catch {
    return {
      status: 502,
      body: { error: "The request was saved, but the confirmation email could not be sent. Try again in a minute." },
    };
  }
  return { status: 200, body: { message: SENT_MESSAGE } };
}

function quietSuccess(configured: boolean, token: string): NewsletterHttp {
  if (configured) return { status: 200, body: { message: SENT_MESSAGE } };
  return {
    status: 200,
    body: {
      message: SAVED_MESSAGE,
      devConfirmPath: `/api/newsletter/confirm?token=${encodeURIComponent(token)}`,
    },
  };
}

export async function handleConfirm(input: {
  token: string;
  nowMs: number;
  site: string;
  env: NewsletterEnv;
  read: () => Promise<PendingSignup[]>;
  write: (rows: PendingSignup[]) => Promise<boolean>;
  saveContact: (row: PendingSignup) => Promise<"saved" | "unconfigured" | "failed">;
  sendWelcome: (row: PendingSignup, unsubUrl: string, unsubToken: string) => Promise<"sent" | "failed">;
}): Promise<ConfirmOutcome> {
  const token = input.token.trim();
  if (!token) return { status: "missing" };
  const rows = await input.read();
  const found = rows.find((row) => row.token === token && Date.parse(row.expiresAt) > input.nowMs);
  if (!found) return { status: "missing" };
  const secret = input.env.NEWSLETTER_UNSUBSCRIBE_SECRET?.trim() || "";
  if (!secret) return { status: "secret" };
  let saved: "saved" | "unconfigured" | "failed";
  try {
    saved = await input.saveContact(found);
  } catch {
    return { status: "storage" };
  }
  if (saved !== "saved") return { status: "storage" };
  const remaining = rows.filter((row) => row.token !== token);
  try {
    await input.write(compactPending(remaining, input.nowMs));
  } catch {
    // The contact is already saved. Still send the unsubscribe link.
  }
  const unsubToken = signUnsubscribeToken(found.email, unsubscribeExpiry(input.nowMs), secret);
  const unsubUrl = `${input.site}/api/newsletter/unsubscribe?token=${encodeURIComponent(unsubToken)}`;
  try {
    const welcomed = await input.sendWelcome(found, unsubUrl, unsubToken);
    if (welcomed === "failed") return { status: "mail", token: unsubToken };
  } catch {
    return { status: "mail", token: unsubToken };
  }
  return { status: "confirmed" };
}

export async function handleUnsubscribe(input: {
  token: string;
  nowMs: number;
  env: NewsletterEnv;
  optOut: (email: string) => Promise<"done" | "unconfigured" | "failed">;
}): Promise<"done" | "missing" | "storage"> {
  const email = verifyUnsubscribeToken(
    input.token.trim(),
    input.env.NEWSLETTER_UNSUBSCRIBE_SECRET?.trim() || "",
    input.nowMs,
  );
  if (!email) return "missing";
  try {
    const result = await input.optOut(email);
    if (result === "done") return "done";
  } catch {
    return "storage";
  }
  return "storage";
}
