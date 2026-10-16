import { timingSafeEqual } from "node:crypto";

export type CronEnv = {
  CRON_SECRET?: string;
  NODE_ENV?: string;
  VERCEL_ENV?: string;
};

export function cronSecretRequired(env: CronEnv): boolean {
  return env.NODE_ENV === "production" || env.VERCEL_ENV === "production";
}

export function authorizeCron(
  request: { headers: { get(name: string): string | null } },
  env: CronEnv,
): Response | null {
  const secret = env.CRON_SECRET?.trim() ?? "";
  if (!secret) {
    if (cronSecretRequired(env)) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    return null;
  }
  if (!bearerMatches(request.headers.get("authorization"), secret)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export function bearerMatches(header: string | null, secret: string): boolean {
  if (!header) return false;
  const prefix = "Bearer ";
  if (!header.startsWith(prefix)) return false;
  const presented = Buffer.from(header.slice(prefix.length));
  const expected = Buffer.from(secret);
  if (presented.length !== expected.length) return false;
  return timingSafeEqual(presented, expected);
}
