import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Shape of the one query authenticateRequest runs, plus the fire-and-forget
// `last_used_at` touch. Stubbed at the module boundary so no test reaches
// Supabase or needs SUPABASE_* in the environment.
type KeyRow = { id: string; user_id: string; revoked_at: string | null };

let lookup: { data: KeyRow | null; error: { message: string } | null };
let touched: string[];

vi.mock("@/integrations/supabase/client.server", () => {
  const update = () => ({
    eq: (_column: string, value: string) => {
      touched.push(value);
      return Promise.resolve({ error: null });
    },
  });
  const select = () => ({
    eq: () => ({ maybeSingle: () => Promise.resolve(lookup) }),
  });
  return { supabaseAdmin: { from: () => ({ select, update }) } };
});

async function load() {
  vi.resetModules();
  return import("./api-auth.server");
}

function request(headers: Record<string, string> = {}) {
  return new Request("https://api.test/v1/instances", { headers });
}

function authorized(token: string, ip = "198.51.100.7") {
  return request({ authorization: `Bearer ${token}`, "x-forwarded-for": ip });
}

const VALID_KEY = `rgpu_live_${"a".repeat(48)}`;

beforeEach(() => {
  lookup = { data: null, error: null };
  touched = [];
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("hashKey", () => {
  it("is a stable SHA-256 hex digest", async () => {
    const { hashKey } = await load();

    const hash = await hashKey("rgpu_live_abc");

    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(await hashKey("rgpu_live_abc")).toBe(hash);
    expect(await hashKey("rgpu_live_abd")).not.toBe(hash);
  });
});

describe("generateKey", () => {
  it("mints a prefixed secret and a displayable prefix", async () => {
    const { API_KEY_PREFIX, generateKey } = await load();

    const { secret, prefix } = generateKey();

    expect(secret.startsWith(API_KEY_PREFIX)).toBe(true);
    // 24 random bytes rendered as hex.
    expect(secret.slice(API_KEY_PREFIX.length)).toMatch(/^[0-9a-f]{48}$/);
    expect(prefix).toBe(secret.slice(0, API_KEY_PREFIX.length + 6));
    expect(generateKey().secret).not.toBe(secret);
  });
});

describe("authenticateRequest", () => {
  it("rejects a request with no Authorization header", async () => {
    const { authenticateRequest } = await load();

    const result = await authenticateRequest(request());

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.response.status).toBe(401);
    await expect(result.response.json()).resolves.toMatchObject({
      error: "unauthorized",
    });
  });

  it.each([
    ["an empty bearer token", "Bearer "],
    ["a bare token with no scheme", VALID_KEY],
    ["the wrong auth scheme", `Basic ${VALID_KEY}`],
    ["a token without the live prefix", "Bearer sk_test_123"],
    ["a prefix-only lookalike", "Bearer rgpu_test_abc"],
  ])("rejects %s", async (_label, header) => {
    const { authenticateRequest } = await load();

    const result = await authenticateRequest(
      request({ authorization: header }),
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.response.status).toBe(401);
  });

  it("accepts a case-insensitive scheme and surrounding whitespace", async () => {
    const { authenticateRequest } = await load();
    lookup = {
      data: { id: "key-1", user_id: "user-1", revoked_at: null },
      error: null,
    };

    const result = await authenticateRequest(
      request({ authorization: `bEaReR  ${VALID_KEY}  ` }),
    );

    expect(result).toEqual({ ok: true, userId: "user-1" });
  });

  it("resolves the user id for a known key", async () => {
    const { authenticateRequest } = await load();
    lookup = {
      data: { id: "key-1", user_id: "user-1", revoked_at: null },
      error: null,
    };

    const result = await authenticateRequest(authorized(VALID_KEY));

    expect(result).toEqual({ ok: true, userId: "user-1" });
  });

  it("touches last_used_at for a known key", async () => {
    const { authenticateRequest } = await load();
    lookup = {
      data: { id: "key-1", user_id: "user-1", revoked_at: null },
      error: null,
    };

    await authenticateRequest(authorized(VALID_KEY));
    await vi.waitFor(() => expect(touched).toEqual(["key-1"]));
  });

  it("rejects a well-formed key that is not in the table", async () => {
    const { authenticateRequest } = await load();

    const result = await authenticateRequest(authorized(VALID_KEY));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.response.status).toBe(401);
    await expect(result.response.json()).resolves.toMatchObject({
      message: "Invalid or revoked API key.",
    });
  });

  it("rejects a revoked key", async () => {
    const { authenticateRequest } = await load();
    lookup = {
      data: {
        id: "key-1",
        user_id: "user-1",
        revoked_at: "2025-12-01T00:00:00.000Z",
      },
      error: null,
    };

    const result = await authenticateRequest(authorized(VALID_KEY));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.response.status).toBe(401);
  });

  it("answers a lookup failure generically, without leaking the message", async () => {
    const { authenticateRequest } = await load();
    vi.spyOn(console, "error").mockImplementation(() => {});
    lookup = { data: null, error: { message: "relation does not exist" } };

    const result = await authenticateRequest(
      request({
        authorization: `Bearer ${VALID_KEY}`,
        "x-request-id": "req-42",
      }),
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.response.status).toBe(500);
    const body = await result.response.json();
    expect(body).toMatchObject({
      error: "internal_error",
      request_id: "req-42",
    });
    expect(JSON.stringify(body)).not.toContain("relation does not exist");
  });

  describe("unauthenticated IP throttle", () => {
    it("allows 30 unauthenticated attempts a minute, then rate-limits", async () => {
      const { authenticateRequest } = await load();
      const unauthenticated = () =>
        authenticateRequest(request({ "x-forwarded-for": "203.0.113.5" }));

      for (let i = 0; i < 30; i += 1) {
        const result = await unauthenticated();
        expect(result.ok ? 200 : result.response.status).toBe(401);
      }

      const limited = await unauthenticated();
      expect(limited.ok).toBe(false);
      if (limited.ok) return;
      expect(limited.response.status).toBe(429);
      expect(limited.response.headers.get("retry-after")).toBe("60");
      expect(limited.response.headers.get("ratelimit-limit")).toBe("30");
      expect(limited.response.headers.get("ratelimit-remaining")).toBe("0");
      await expect(limited.response.json()).resolves.toMatchObject({
        error: "rate_limited",
      });
    });

    it("throttles each source IP separately", async () => {
      const { authenticateRequest } = await load();
      const from = (ip: string) =>
        authenticateRequest(request({ "x-forwarded-for": ip }));

      for (let i = 0; i < 31; i += 1) await from("203.0.113.5");
      const other = await from("203.0.113.6");

      expect(other.ok).toBe(false);
      if (other.ok) return;
      expect(other.response.status).toBe(401);
    });

    it("lets the window lapse", async () => {
      const { authenticateRequest } = await load();
      const from = () =>
        authenticateRequest(request({ "x-forwarded-for": "203.0.113.5" }));

      for (let i = 0; i < 31; i += 1) await from();
      vi.advanceTimersByTime(60_000);
      const after = await from();

      expect(after.ok).toBe(false);
      if (after.ok) return;
      expect(after.response.status).toBe(401);
    });

    it("throttles a key-shaped token on its hash, at the higher limit", async () => {
      const { authenticateRequest } = await load();

      // 31 attempts: past the unauthenticated ceiling but inside the
      // per-key one, so these must still be answered 401, not 429.
      for (let i = 0; i < 31; i += 1) {
        const result = await authenticateRequest(authorized(VALID_KEY));
        expect(result.ok ? 200 : result.response.status).toBe(401);
      }
    });
  });
});

describe("enforcePublicRateLimit", () => {
  it("passes the first 30 requests a minute from one IP", async () => {
    const { enforcePublicRateLimit } = await load();
    const call = () =>
      enforcePublicRateLimit(request({ "x-forwarded-for": "203.0.113.9" }));

    for (let i = 0; i < 30; i += 1) expect(call()).toBeNull();

    const limited = call();
    expect(limited?.status).toBe(429);
  });

  it("reads the first hop of x-forwarded-for", async () => {
    const { enforcePublicRateLimit } = await load();

    for (let i = 0; i < 31; i += 1) {
      enforcePublicRateLimit(
        request({ "x-forwarded-for": "203.0.113.9, 10.0.0.1" }),
      );
    }
    const sameClient = enforcePublicRateLimit(
      request({ "x-forwarded-for": "203.0.113.9, 10.0.0.2" }),
    );

    expect(sameClient?.status).toBe(429);
  });

  it("falls back to cf-connecting-ip, then x-real-ip", async () => {
    const { enforcePublicRateLimit } = await load();

    for (let i = 0; i < 31; i += 1) {
      enforcePublicRateLimit(request({ "cf-connecting-ip": "203.0.113.10" }));
    }

    expect(
      enforcePublicRateLimit(request({ "cf-connecting-ip": "203.0.113.10" }))
        ?.status,
    ).toBe(429);
    expect(
      enforcePublicRateLimit(request({ "x-real-ip": "203.0.113.11" })),
    ).toBeNull();
  });

  it("buckets requests with no client ip under a single key", async () => {
    const { enforcePublicRateLimit } = await load();

    for (let i = 0; i < 30; i += 1) {
      expect(enforcePublicRateLimit(request())).toBeNull();
    }

    expect(enforcePublicRateLimit(request())?.status).toBe(429);
  });
});

describe("json", () => {
  it("serialises the body with CORS and no-store headers", async () => {
    const { json } = await load();

    const response = json({ ok: true }, 201, { "x-extra": "1" });

    expect(response.status).toBe(201);
    expect(response.headers.get("content-type")).toBe(
      "application/json; charset=utf-8",
    );
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    expect(response.headers.get("x-extra")).toBe("1");
    await expect(response.json()).resolves.toEqual({ ok: true });
  });
});

describe("corsPreflight", () => {
  it("answers 204 with the allowed methods", async () => {
    const { corsPreflight } = await load();

    const response = corsPreflight();

    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-methods")).toBe(
      "GET, POST, DELETE, OPTIONS",
    );
  });
});

describe("failure", () => {
  it("carries a PublicError's code, message and status to the caller", async () => {
    const { failure } = await load();
    const { PublicError } = await import("./errors");

    const response = failure(
      new PublicError("Instance is already running.", {
        status: 409,
        code: "conflict",
      }),
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "conflict",
      message: "Instance is already running.",
    });
  });

  it("reports Zod issues as a 422 with field paths", async () => {
    const { failure } = await load();
    const { z } = await import("zod");
    const parsed = z
      .object({ gpu: z.object({ id: z.string() }) })
      .safeParse({ gpu: { id: 7 } });

    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    const response = failure(parsed.error);

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({
      error: "invalid_request",
      issues: [{ path: "gpu.id" }],
    });
  });

  it("hides an unexpected error behind a request id", async () => {
    const { failure } = await load();
    vi.spyOn(console, "error").mockImplementation(() => {});

    const response = failure(
      new Error("ECONNREFUSED 10.0.0.1:5432"),
      request({ "x-request-id": "req-7" }),
    );

    expect(response.status).toBe(500);
    expect(response.headers.get("x-request-id")).toBe("req-7");
    const body = await response.json();
    expect(body).toMatchObject({
      error: "internal_error",
      request_id: "req-7",
    });
    expect(JSON.stringify(body)).not.toContain("ECONNREFUSED");
  });
});
