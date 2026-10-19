import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The counter map lives at module scope, so every test gets a fresh copy of
// the module and drives the clock itself.
async function load() {
  vi.resetModules();
  return import("./rate-limit.server");
}

const MAX_TRACKED_KEYS = 10_000;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("checkRateLimit", () => {
  it("allows the first request and reports the full window", async () => {
    const { checkRateLimit } = await load();

    const result = checkRateLimit("k", 3, 60_000);

    expect(result.allowed).toBe(true);
    expect(result.limit).toBe(3);
    expect(result.remaining).toBe(2);
    expect(result.resetAt).toBe(Date.now() + 60_000);
    expect(result.retryAfterSeconds).toBe(60);
  });

  it("allows exactly up to the limit, then rejects", async () => {
    const { checkRateLimit } = await load();

    const allowed = [1, 2, 3].map(() => checkRateLimit("k", 3, 60_000));

    expect(allowed.map((r) => r.allowed)).toEqual([true, true, true]);
    expect(allowed.map((r) => r.remaining)).toEqual([2, 1, 0]);

    const rejected = checkRateLimit("k", 3, 60_000);
    expect(rejected.allowed).toBe(false);
    expect(rejected.remaining).toBe(0);
  });

  it("keeps remaining at zero rather than going negative", async () => {
    const { checkRateLimit } = await load();

    for (let i = 0; i < 5; i += 1) checkRateLimit("k", 1, 60_000);
    const result = checkRateLimit("k", 1, 60_000);

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("counts each key independently", async () => {
    const { checkRateLimit } = await load();

    checkRateLimit("a", 1, 60_000);
    const a = checkRateLimit("a", 1, 60_000);
    const b = checkRateLimit("b", 1, 60_000);

    expect(a.allowed).toBe(false);
    expect(b.allowed).toBe(true);
  });

  it("holds the window open for its full duration", async () => {
    const { checkRateLimit } = await load();
    const openedAt = Date.now();

    checkRateLimit("k", 1, 60_000);
    vi.advanceTimersByTime(59_999);
    const result = checkRateLimit("k", 1, 60_000);

    expect(result.allowed).toBe(false);
    // Still the original window, not a new one.
    expect(result.resetAt).toBe(openedAt + 60_000);
    expect(result.retryAfterSeconds).toBe(1);
  });

  it("starts a fresh window once the old one has elapsed", async () => {
    const { checkRateLimit } = await load();

    checkRateLimit("k", 1, 60_000);
    expect(checkRateLimit("k", 1, 60_000).allowed).toBe(false);

    vi.advanceTimersByTime(60_000);
    const result = checkRateLimit("k", 1, 60_000);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(0);
    expect(result.resetAt).toBe(Date.now() + 60_000);
  });

  it("never reports a retry-after below one second", async () => {
    const { checkRateLimit } = await load();

    checkRateLimit("k", 1, 100);
    vi.advanceTimersByTime(99);
    const result = checkRateLimit("k", 1, 100);

    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBe(1);
  });

  it("rounds retry-after up to whole seconds", async () => {
    const { checkRateLimit } = await load();

    checkRateLimit("k", 1, 2_500);
    const result = checkRateLimit("k", 1, 2_500);

    expect(result.retryAfterSeconds).toBe(3);
  });

  describe("at the tracked-key cap", () => {
    it("evicts the oldest half when every window is still live", async () => {
      const { checkRateLimit } = await load();

      // The shortest window, so this key sorts oldest by resetAt.
      checkRateLimit("victim", 1, 1_000);
      for (let i = 0; i < MAX_TRACKED_KEYS - 1; i += 1) {
        checkRateLimit(`filler:${i}`, 1, 60_000);
      }

      // Hits the cap, so the new key's insertion triggers the eviction.
      checkRateLimit("newcomer", 1, 60_000);

      // Without eviction this would be the victim's second request in its
      // window and therefore rejected.
      expect(checkRateLimit("victim", 1, 1_000).allowed).toBe(true);
    });

    it("sweeps expired windows without touching live ones", async () => {
      const { checkRateLimit } = await load();

      checkRateLimit("keeper", 2, 600_000);
      for (let i = 0; i < MAX_TRACKED_KEYS - 1; i += 1) {
        checkRateLimit(`stale:${i}`, 1, 1_000);
      }

      vi.advanceTimersByTime(2_000);
      checkRateLimit("newcomer", 1, 60_000);

      // The keeper's window outlives the sweep, so its count carries over.
      expect(checkRateLimit("keeper", 2, 600_000).allowed).toBe(true);
      expect(checkRateLimit("keeper", 2, 600_000).allowed).toBe(false);
    });
  });
});

describe("rateLimitHeaders", () => {
  it("renders the counters as strings", async () => {
    const { checkRateLimit, rateLimitHeaders } = await load();

    const headers = rateLimitHeaders(checkRateLimit("k", 30, 60_000));

    expect(headers).toEqual({
      "ratelimit-limit": "30",
      "ratelimit-remaining": "29",
      "ratelimit-reset": "60",
    });
  });
});
