import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

async function loadRateLimitCore() {
  try {
    return await import("../lib/rate-limit-core.ts");
  } catch (err) {
    assert.fail(`rate-limit core module should exist and import cleanly: ${err.message}`);
  }
}

function readRequired(path) {
  assert.ok(existsSync(path), `${path} should exist`);
  return readFileSync(path, "utf8");
}

function assertRouteIsLimited(path, limitName) {
  const route = readRequired(path);
  assert.match(route, /enforceRateLimit/);
  assert.match(route, /rateLimitResponse/);
  assert.match(route, new RegExp(limitName));

  const sessionIndex = route.indexOf("auth.api.getSession");
  const limiterIndex = route.indexOf("await enforceRateLimit");
  const bodyIndex = route.indexOf("let body");

  assert.ok(sessionIndex !== -1, `${path} should authenticate first`);
  assert.ok(limiterIndex !== -1, `${path} should enforce a rate limit`);
  assert.ok(bodyIndex !== -1, `${path} should parse a request body`);
  assert.ok(
    sessionIndex < limiterIndex,
    `${path} should rate-limit after the authenticated user is known`,
  );
  assert.ok(
    limiterIndex < bodyIndex,
    `${path} should rate-limit before parsing the request body`,
  );
}

test("rate-limit result allows requests at the configured maximum", async () => {
  const { buildRateLimitResult } = await loadRateLimitCore();

  const result = buildRateLimitResult({
    count: 10,
    limit: 10,
    windowMs: 60_000,
    windowStart: new Date("2026-05-23T10:00:00.000Z"),
    now: new Date("2026-05-23T10:00:20.000Z"),
  });

  assert.deepEqual(result, {
    allowed: true,
    limit: 10,
    remaining: 0,
    retryAfterSeconds: 0,
    resetAt: new Date("2026-05-23T10:01:00.000Z"),
  });
});

test("rate-limit result blocks requests over the configured maximum", async () => {
  const { buildRateLimitResult } = await loadRateLimitCore();

  const result = buildRateLimitResult({
    count: 11,
    limit: 10,
    windowMs: 60_000,
    windowStart: new Date("2026-05-23T10:00:00.000Z"),
    now: new Date("2026-05-23T10:00:20.200Z"),
  });

  assert.deepEqual(result, {
    allowed: false,
    limit: 10,
    remaining: 0,
    retryAfterSeconds: 40,
    resetAt: new Date("2026-05-23T10:01:00.000Z"),
  });
});

test("app has a shared database table for rate-limit counters", () => {
  const schema = readRequired("lib/db/schema.ts");
  const journal = readRequired("drizzle/meta/_journal.json");
  const latestMigration = readRequired("drizzle/0002_app_rate_limit.sql");

  assert.match(schema, /export const appRateLimit = pgTable\(\s*"app_rate_limit"/);
  assert.match(schema, /key: text\("key"\)\.primaryKey\(\)/);
  assert.match(schema, /count: integer\("count"\)\.notNull\(\)/);
  assert.match(schema, /windowStart: timestamp\("window_start", \{ withTimezone: true \}\)\.notNull\(\)/);
  assert.match(latestMigration, /CREATE TABLE "app_rate_limit"/);
  assert.match(journal, /0002_app_rate_limit/);
});

test("expensive authenticated routes enforce per-user rate limits", () => {
  assertRouteIsLimited("app/api/ai/generate/route.ts", "AI_GENERATION_RATE_LIMIT");
  assertRouteIsLimited(
    "app/api/ai/pending/[id]/refine/route.ts",
    "AI_GENERATION_RATE_LIMIT",
  );
  assertRouteIsLimited("app/api/calendar/events/route.ts", "GOOGLE_WRITE_RATE_LIMIT");
  assertRouteIsLimited("app/api/tasks/route.ts", "GOOGLE_WRITE_RATE_LIMIT");
});

test("rate-limit module prunes stale rows opportunistically", () => {
  const source = readRequired("lib/rate-limit.ts");

  assert.match(source, /export async function pruneExpiredRateLimits/);
  assert.match(source, /RATE_LIMIT_RETENTION_MS/);
  assert.match(source, /RATE_LIMIT_PRUNE_PROBABILITY/);
  assert.match(source, /lt\(appRateLimit\.updatedAt/);
  assert.match(source, /Math\.random\(\) < RATE_LIMIT_PRUNE_PROBABILITY/);
  assert.match(source, /await pruneExpiredRateLimits\(\)/);
});
