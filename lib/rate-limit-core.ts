export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
  resetAt: Date;
};

export function buildRateLimitResult(input: {
  count: number;
  limit: number;
  windowMs: number;
  windowStart: Date;
  now: Date;
}): RateLimitResult {
  const resetAt = new Date(input.windowStart.getTime() + input.windowMs);
  const allowed = input.count <= input.limit;
  const retryAfterMs = Math.max(0, resetAt.getTime() - input.now.getTime());

  return {
    allowed,
    limit: input.limit,
    remaining: Math.max(0, input.limit - input.count),
    retryAfterSeconds: allowed ? 0 : Math.ceil(retryAfterMs / 1000),
    resetAt,
  };
}
