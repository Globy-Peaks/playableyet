export const SIGNUP_IP_LIMIT = 5;
export const SIGNUP_IP_WINDOW_MS = 60 * 60 * 1000;
export const SIGNUP_EMAIL_LIMIT = 3;
export const SIGNUP_EMAIL_WINDOW_MS = 60 * 60 * 1000;
export const SIGNUP_COOLDOWN_MS = 60 * 1000;

export function allowHits(
  now: number,
  hits: number[],
  limit: number,
  windowMs: number,
): { allowed: boolean; hits: number[]; retryAfterMs: number } {
  const fresh = hits.filter((at) => now >= at && now - at < windowMs);
  if (fresh.length >= limit) {
    const oldest = Math.min(...fresh);
    return { allowed: false, hits: fresh, retryAfterMs: Math.max(0, windowMs - (now - oldest)) };
  }
  return { allowed: true, hits: [...fresh, now], retryAfterMs: 0 };
}

export type RateBook = {
  take(key: string, now: number, limit: number, windowMs: number): { allowed: boolean; retryAfterMs: number };
};

/** In-memory limits. Each serverless instance has its own map. */
export function memoryRateBook(): RateBook {
  const buckets = new Map<string, number[]>();
  return {
    take(key, now, limit, windowMs) {
      const result = allowHits(now, buckets.get(key) ?? [], limit, windowMs);
      buckets.set(key, result.hits);
      return { allowed: result.allowed, retryAfterMs: result.retryAfterMs };
    },
  };
}

export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
  const real = headers.get("x-real-ip")?.trim() ?? "";
  const ip = forwarded || real;
  if (!ip || ip.length > 80 || /[\s,]/.test(ip)) return "unknown";
  return ip;
}
