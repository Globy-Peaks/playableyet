import { randomBytes } from "node:crypto";
import { confirmMail, handleConfirm, handleSignup, handleUnsubscribe, welcomeMail } from "@/lib/newsletter";
import { exclusive, persistPending, readPending } from "@/lib/newsletter-pending";
import { clientIp, memoryRateBook } from "@/lib/newsletter-rate";
import { optOutSubscriber, saveSubscriber, sendResendEmail } from "@/lib/newsletter-resend";
import { siteUrl } from "@/lib/site";

const rateBook = memoryRateBook();

export async function submitNewsletter(request: Request) {
  let body: { email?: unknown; consent?: unknown; company_website?: unknown };
  try {
    body = (await request.json()) as { email?: unknown; consent?: unknown; company_website?: unknown };
  } catch {
    return { status: 400, body: { error: "Send an email address." } };
  }
  return exclusive(() =>
    handleSignup({
      email: body.email,
      consent: body.consent,
      companyWebsite: body.company_website,
      ip: clientIp(request.headers),
      nowMs: Date.now(),
      env: process.env,
      rate: rateBook,
      read: readPending,
      write: persistPending,
      send: async (row) => {
        const mail = confirmMail(siteUrl(), row.token);
        const result = await sendResendEmail({
          env: process.env,
          to: row.email,
          subject: mail.subject,
          html: mail.html,
          text: mail.text,
          idempotencyKey: `newsletter-confirm/${row.token}`,
        });
        return result === "sent" ? "sent" : "failed";
      },
      newToken: () => randomBytes(24).toString("hex"),
    }),
  );
}

export async function confirmNewsletter(token: string) {
  return exclusive(() =>
    handleConfirm({
      token,
      nowMs: Date.now(),
      site: siteUrl(),
      env: process.env,
      read: readPending,
      write: persistPending,
      saveContact: (row) =>
        saveSubscriber({
          email: row.email,
          consentAt: row.consentAt,
          env: process.env,
          idempotencyKey: `newsletter-contact/${row.token}`,
        }),
      sendWelcome: async (row, unsubUrl, unsubToken) => {
        const mail = welcomeMail(unsubUrl);
        const result = await sendResendEmail({
          env: process.env,
          to: row.email,
          subject: mail.subject,
          html: mail.html,
          text: mail.text,
          headers: mail.headers,
          idempotencyKey: `newsletter-welcome/${unsubToken.slice(0, 80)}`,
        });
        return result === "sent" ? "sent" : "failed";
      },
    }),
  );
}

export async function unsubscribeNewsletter(token: string) {
  return handleUnsubscribe({
    token,
    nowMs: Date.now(),
    env: process.env,
    optOut: (email) => optOutSubscriber({ email, env: process.env }),
  });
}

export function confirmRedirectPath(outcome: Awaited<ReturnType<typeof confirmNewsletter>>): string {
  if (outcome.status === "confirmed") return "/newsletter/confirmed";
  if (outcome.status === "mail") return `/newsletter/confirmed?status=mail&unsub=${encodeURIComponent(outcome.token)}`;
  if (outcome.status === "storage") return "/newsletter/confirmed?status=storage";
  if (outcome.status === "secret") return "/newsletter/confirmed?status=secret";
  return "/newsletter/confirmed?status=missing";
}

export function unsubscribeRedirectPath(outcome: Awaited<ReturnType<typeof unsubscribeNewsletter>>): string {
  if (outcome === "done") return "/newsletter/unsubscribed";
  if (outcome === "storage") return "/newsletter/unsubscribed?status=storage";
  return "/newsletter/unsubscribed?status=missing";
}
