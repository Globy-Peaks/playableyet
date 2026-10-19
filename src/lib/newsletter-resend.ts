/**
 * PlayableYet subscribers are Resend contacts, not a new segment.
 * The account already uses its 3 segment slots.
 *
 * Targeting a weekly broadcast:
 * - segment: General (3bf0bab2-b053-46b4-aef1-72358e7a4605), unless RESEND_NEWSLETTER_SEGMENT_ID overrides it
 * - topic: PlayableYet weekly (31c1c8a5-6ecd-4dca-899a-0ec1f354a856), default subscription opt-out
 * - property: source=playableyet, plus playableyet_consent_at
 *
 * A General broadcast without a topic would include these contacts. Always set the topic.
 * Never use the PatchVerdict Newsletter or Sponsor Inquiries segments.
 * Unsubscribe opts this topic out. It does not set the contact's global unsubscribed flag,
 * so an address that also receives PatchVerdict mail stays subscribed there.
 */

export const PLAYABLEYET_TOPIC_ID = "31c1c8a5-6ecd-4dca-899a-0ec1f354a856";
export const GENERAL_SEGMENT_ID = "3bf0bab2-b053-46b4-aef1-72358e7a4605";
export const PATCHVERDICT_SEGMENT_ID = "251a2bd7-fba2-44c3-bc8b-c4540caccff8";
export const SPONSOR_SEGMENT_ID = "b4130358-1335-4802-a2dd-73f65715c13f";

const FORBIDDEN_SEGMENT_IDS = new Set([PATCHVERDICT_SEGMENT_ID, SPONSOR_SEGMENT_ID]);

export type NewsletterEnv = {
  NODE_ENV?: string;
  RESEND_API_KEY?: string;
  RESEND_FROM?: string;
  RESEND_CONTACTS_API_KEY?: string;
  RESEND_NEWSLETTER_TOPIC_ID?: string;
  RESEND_NEWSLETTER_SEGMENT_ID?: string;
  NEWSLETTER_UNSUBSCRIBE_SECRET?: string;
  BLOB_READ_WRITE_TOKEN?: string;
};

export type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

export function newsletterTopicId(env: NewsletterEnv): string {
  return env.RESEND_NEWSLETTER_TOPIC_ID?.trim() || PLAYABLEYET_TOPIC_ID;
}

/** General, unless a non-forbidden override is set. PatchVerdict and Sponsor are never returned. */
export function newsletterSegmentId(env: NewsletterEnv): string {
  const id = env.RESEND_NEWSLETTER_SEGMENT_ID?.trim() || "";
  if (!id || FORBIDDEN_SEGMENT_IDS.has(id)) return GENERAL_SEGMENT_ID;
  return id;
}

export function contactProperties(consentAt: string): { source: string; playableyet_consent_at: string } {
  return { source: "playableyet", playableyet_consent_at: consentAt };
}

export function createContactBody(email: string, consentAt: string, env: NewsletterEnv) {
  return {
    email,
    unsubscribed: false,
    properties: contactProperties(consentAt),
    topics: [{ id: newsletterTopicId(env), subscription: "opt_in" as const }],
    segments: [{ id: newsletterSegmentId(env) }],
  };
}

export function topicSubscriptionBody(env: NewsletterEnv, subscription: "opt_in" | "opt_out") {
  return [{ id: newsletterTopicId(env), subscription }];
}

export function propertyPatchBody(consentAt: string) {
  return { properties: contactProperties(consentAt) };
}

function contactUrl(email: string): string {
  return `https://api.resend.com/contacts/${encodeURIComponent(email)}`;
}

async function callResend(
  fetchImpl: FetchLike,
  key: string,
  url: string,
  method: string,
  body?: unknown,
  idempotencyKey?: string,
): Promise<{ status: number }> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
  const response = await fetchImpl(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  await response.text();
  if (response.status >= 400 && response.status !== 409) {
    console.error(`PlayableYet newsletter Resend ${method} ${response.status}`);
  }
  return { status: response.status };
}

function keyFailure(status: number): "unconfigured" | "failed" {
  return status === 401 || status === 403 ? "unconfigured" : "failed";
}

export async function saveSubscriber(input: {
  email: string;
  consentAt: string;
  env: NewsletterEnv;
  idempotencyKey: string;
  fetchImpl?: FetchLike;
}): Promise<"saved" | "unconfigured" | "failed"> {
  const key = input.env.RESEND_CONTACTS_API_KEY?.trim() || "";
  if (!key) return "unconfigured";
  const fetchImpl = input.fetchImpl ?? fetch;
  const created = await callResend(
    fetchImpl,
    key,
    "https://api.resend.com/contacts",
    "POST",
    createContactBody(input.email, input.consentAt, input.env),
    input.idempotencyKey,
  );
  if (created.status !== 200 && created.status !== 201 && created.status !== 409) {
    return keyFailure(created.status);
  }
  if (created.status === 409) {
    const patched = await callResend(
      fetchImpl,
      key,
      contactUrl(input.email),
      "PATCH",
      propertyPatchBody(input.consentAt),
    );
    if (patched.status !== 200 && patched.status !== 201) return keyFailure(patched.status);
  }
  const topics = await callResend(
    fetchImpl,
    key,
    `${contactUrl(input.email)}/topics`,
    "PATCH",
    topicSubscriptionBody(input.env, "opt_in"),
  );
  if (topics.status !== 200 && topics.status !== 201) return keyFailure(topics.status);
  const segment = newsletterSegmentId(input.env);
  const added = await callResend(
    fetchImpl,
    key,
    `${contactUrl(input.email)}/segments/${segment}`,
    "POST",
  );
  if (added.status === 200 || added.status === 201 || added.status === 409) return "saved";
  return keyFailure(added.status);
}

export async function optOutSubscriber(input: {
  email: string;
  env: NewsletterEnv;
  fetchImpl?: FetchLike;
}): Promise<"done" | "unconfigured" | "failed"> {
  const key = input.env.RESEND_CONTACTS_API_KEY?.trim() || "";
  if (!key) return "unconfigured";
  const result = await callResend(
    input.fetchImpl ?? fetch,
    key,
    `${contactUrl(input.email)}/topics`,
    "PATCH",
    topicSubscriptionBody(input.env, "opt_out"),
  );
  if (result.status === 200 || result.status === 201 || result.status === 404) return "done";
  return keyFailure(result.status);
}

export async function sendResendEmail(input: {
  env: NewsletterEnv;
  to: string;
  subject: string;
  html: string;
  text: string;
  idempotencyKey: string;
  headers?: Record<string, string>;
  fetchImpl?: FetchLike;
}): Promise<"sent" | "unconfigured" | "failed"> {
  const key = input.env.RESEND_API_KEY?.trim() || "";
  const from = input.env.RESEND_FROM?.trim() || "";
  if (!key || !from) return "unconfigured";
  const result = await callResend(
    input.fetchImpl ?? fetch,
    key,
    "https://api.resend.com/emails",
    "POST",
    {
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      headers: input.headers,
    },
    input.idempotencyKey,
  );
  if (result.status === 200 || result.status === 201) return "sent";
  return "failed";
}
