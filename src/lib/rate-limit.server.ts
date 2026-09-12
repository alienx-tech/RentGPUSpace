// Fixed-window counter, in memory.
//
// Scope: one server process. Behind multiple replicas the effective ceiling is
// limit x replicas, so treat this as abuse damping rather than a billing-grade
// quota; a shared store is the upgrade path when that matters.

type Window = { count: number; resetAt: number };

const windows = new Map<string, Window>();
const MAX_TRACKED_KEYS = 10_000;

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
};

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const existing = windows.get(key);

  if (!existing || existing.resetAt <= now) {
    // Sweep expired entries before growing, so a stream of unique keys (rotating
    // IPs, invalid tokens) cannot pin memory.
    if (windows.size >= MAX_TRACKED_KEYS) evictExpired(now);
    const window: Window = { count: 1, resetAt: now + windowMs };
    windows.set(key, window);
    return result(true, limit, limit - 1, window.resetAt, now);
  }

  existing.count += 1;
  const remaining = Math.max(0, limit - existing.count);
  return result(
    existing.count <= limit,
    limit,
    remaining,
    existing.resetAt,
    now,
  );
}

function result(
  allowed: boolean,
  limit: number,
  remaining: number,
  resetAt: number,
  now: number,
): RateLimitResult {
  return {
    allowed,
    limit,
    remaining,
    resetAt,
    retryAfterSeconds: Math.max(1, Math.ceil((resetAt - now) / 1000)),
  };
}

function evictExpired(now: number): void {
  for (const [key, window] of windows) {
    if (window.resetAt <= now) windows.delete(key);
  }
  // Every window is still live: drop the oldest half rather than grow unbounded.
  if (windows.size >= MAX_TRACKED_KEYS) {
    const ordered = [...windows.entries()].sort(
      (a, b) => a[1].resetAt - b[1].resetAt,
    );
    for (const [key] of ordered.slice(0, Math.floor(ordered.length / 2)))
      windows.delete(key);
  }
}

export function rateLimitHeaders(
  result: RateLimitResult,
): Record<string, string> {
  return {
    "ratelimit-limit": String(result.limit),
    "ratelimit-remaining": String(result.remaining),
    "ratelimit-reset": String(result.retryAfterSeconds),
  };
}
