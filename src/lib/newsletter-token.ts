import { createHmac, timingSafeEqual } from "node:crypto";

const TWO_YEARS_SECONDS = 60 * 60 * 24 * 730;

export function unsubscribeExpiry(nowMs: number): number {
  return Math.floor(nowMs / 1000) + TWO_YEARS_SECONDS;
}

export function signUnsubscribeToken(email: string, exp: number, secret: string): string {
  const payload = `${email}\n${exp}`;
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${Buffer.from(payload, "utf8").toString("base64url")}.${signature}`;
}

export function verifyUnsubscribeToken(token: string, secret: string, nowMs: number): string | null {
  if (!secret) return null;
  const split = token.split(".");
  if (split.length !== 2) return null;
  const [encoded, signature] = split;
  if (!encoded || !signature) return null;
  let payload: string;
  try {
    payload = Buffer.from(encoded, "base64url").toString("utf8");
  } catch {
    return null;
  }
  const expected = createHmac("sha256", secret).update(payload).digest("base64url");
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) {
    return null;
  }
  const breakAt = payload.lastIndexOf("\n");
  if (breakAt < 1) return null;
  const email = payload.slice(0, breakAt);
  const exp = Number(payload.slice(breakAt + 1));
  if (!email.includes("@") || !Number.isFinite(exp)) return null;
  if (exp * 1000 <= nowMs) return null;
  return email;
}
