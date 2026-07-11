import "server-only";

import { NextResponse } from "next/server";
import { lt, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { appRateLimit } from "@/lib/db/schema";
import {
  buildRateLimitResult,
  type RateLimitResult,
} from "@/lib/rate-limit-core";

export type RateLimitConfig = {
  scope: string;
  limit: number;
  windowMs: number;
};

export const AI_GENERATION_RATE_LIMIT: RateLimitConfig = {
  scope: "ai:generation",
  limit: 10,
  windowMs: 60_000,
};

export const GOOGLE_WRITE_RATE_LIMIT: RateLimitConfig = {
  scope: "google:write",
  limit: 20,
  windowMs: 60_000,
};

/** Drop keys unused longer than this (windows are ≤ 1 min). */
export const RATE_LIMIT_RETENTION_MS = 60 * 60 * 1000;

/** Roughly 1% of enforce calls trigger a prune. */
export const RATE_LIMIT_PRUNE_PROBABILITY = 0.01;

function buildKey(scope: string, identifier: string): string {
  return `${scope}:${identifier}`;
}

/**
 * Deletes stale rate-limit rows via the existing `updated_at` index.
 * Safe for any key whose sliding window has long since expired.
 */
export async function pruneExpiredRateLimits(
  olderThan: Date = new Date(Date.now() - RATE_LIMIT_RETENTION_MS),
): Promise<number> {
  const deleted = await db
    .delete(appRateLimit)
    .where(lt(appRateLimit.updatedAt, olderThan))
    .returning({ key: appRateLimit.key });

  return deleted.length;
}

export async function enforceRateLimit(input: RateLimitConfig & {
  identifier: string;
}): Promise<RateLimitResult> {
  const now = new Date();
  const cutoff = new Date(now.getTime() - input.windowMs);
  const blockedCount = input.limit + 1;

  const [row] = await db
    .insert(appRateLimit)
    .values({
      key: buildKey(input.scope, input.identifier),
      count: 1,
      windowStart: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: appRateLimit.key,
      set: {
        count: sql<number>`
          case
            when ${appRateLimit.windowStart} <= ${cutoff} then 1
            else least(${appRateLimit.count} + 1, ${blockedCount})
          end
        `,
        windowStart: sql<Date>`
          case
            when ${appRateLimit.windowStart} <= ${cutoff} then ${now}
            else ${appRateLimit.windowStart}
          end
        `,
        updatedAt: now,
      },
    })
    .returning({
      count: appRateLimit.count,
      windowStart: appRateLimit.windowStart,
    });

  // Opportunistic cleanup so inactive user keys do not accumulate forever.
  if (Math.random() < RATE_LIMIT_PRUNE_PROBABILITY) {
    try {
      await pruneExpiredRateLimits();
    } catch {
      // Prune must never fail the rate-limit path.
    }
  }

  return buildRateLimitResult({
    count: row.count,
    limit: input.limit,
    windowMs: input.windowMs,
    windowStart: row.windowStart,
    now,
  });
}

export function rateLimitResponse(result: RateLimitResult) {
  return NextResponse.json(
    {
      error: "Too many requests",
      retryAfterSeconds: result.retryAfterSeconds,
    },
    {
      status: 429,
      headers: {
        "Retry-After": result.retryAfterSeconds.toString(),
        "X-RateLimit-Limit": result.limit.toString(),
        "X-RateLimit-Remaining": result.remaining.toString(),
        "X-RateLimit-Reset": Math.ceil(
          result.resetAt.getTime() / 1000,
        ).toString(),
      },
    },
  );
}
