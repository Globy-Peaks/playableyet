import assert from "node:assert/strict";
import test from "node:test";
import { authorizeCron } from "./cron-auth";

function request(authorization: string | null) {
  return { headers: { get: () => authorization } };
}

test("production rejects a missing cron secret", () => {
  const response = authorizeCron(request(null), { NODE_ENV: "production" });
  assert.equal(response?.status, 401);
  const preview = authorizeCron(request("Bearer "), { VERCEL_ENV: "production" });
  assert.equal(preview?.status, 401);
});

test("a set secret must match in every environment", () => {
  const env = { NODE_ENV: "development", CRON_SECRET: "cron-secret" };
  assert.equal(authorizeCron(request(null), env)?.status, 401);
  assert.equal(authorizeCron(request("Bearer wrong-secret"), env)?.status, 401);
  assert.equal(authorizeCron(request("Bearer cron-secret"), env), null);
  assert.equal(authorizeCron(request("Bearer cron-secret"), { NODE_ENV: "production", CRON_SECRET: "cron-secret" }), null);
});

test("local dev allows the route only when the secret is unset", () => {
  assert.equal(authorizeCron(request(null), { NODE_ENV: "development" }), null);
  assert.equal(authorizeCron(request(null), {}), null);
});
