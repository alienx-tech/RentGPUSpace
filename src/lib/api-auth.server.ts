import { ZodError } from "zod";

import { PublicError } from "./errors";
import { REQUEST_ID_HEADER, logError, requestIdOf } from "./observability";
import { checkRateLimit, rateLimitHeaders } from "./rate-limit.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const API_KEY_PREFIX = "rgpu_live_";

// Per key (or per source IP while unauthenticated) — see rate-limit.server.ts
// for the single-process caveat.
const RATE_LIMIT_WINDOW_MS = 60_000;
const AUTHENTICATED_REQUESTS_PER_MINUTE = 120;
const UNAUTHENTICATED_REQUESTS_PER_MINUTE = 30;

const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, content-type",
  "access-control-allow-methods": "GET, POST, DELETE, OPTIONS",
  "access-control-max-age": "86400",
} as const;

export async function hashKey(secret: string) {
  const bytes = new TextEncoder().encode(secret);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function generateKey() {
  const raw = crypto.getRandomValues(new Uint8Array(24));
  const body = Array.from(raw)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const secret = `${API_KEY_PREFIX}${body}`;
  return { secret, prefix: secret.slice(0, API_KEY_PREFIX.length + 6) };
}

export function json(
  body: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {},
) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...CORS_HEADERS,
      ...extraHeaders,
    },
  });
}

export function corsPreflight() {
  return new Response(null, { status: 204, headers: { ...CORS_HEADERS } });
}

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return (
    forwarded?.split(",")[0]?.trim() ||
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

function rateLimited(key: string, limit: number) {
  const result = checkRateLimit(key, limit, RATE_LIMIT_WINDOW_MS);
  if (result.allowed) return null;
  return json(
    {
      error: "rate_limited",
      message: "Too many requests. Slow down and retry.",
    },
    429,
    {
      ...rateLimitHeaders(result),
      "retry-after": String(result.retryAfterSeconds),
    },
  );
}

/** Throttles an endpoint that has no API key to key on, e.g. the public catalogue. */
export function enforcePublicRateLimit(request: Request): Response | null {
  return rateLimited(
    `ip:${clientIp(request)}`,
    UNAUTHENTICATED_REQUESTS_PER_MINUTE,
  );
}

/** Resolves the caller's user id from an `Authorization: Bearer rgpu_live_...` header. */
export async function authenticateRequest(
  request: Request,
): Promise<{ ok: true; userId: string } | { ok: false; response: Response }> {
  const header = request.headers.get("authorization") ?? "";
  const token = header.toLowerCase().startsWith("bearer ")
    ? header.slice(7).trim()
    : "";
  if (!token || !token.startsWith(API_KEY_PREFIX)) {
    // Throttle on IP here: an unauthenticated caller has no key to key off, and
    // this is the path a credential-stuffing loop hammers.
    const throttled = rateLimited(
      `ip:${clientIp(request)}`,
      UNAUTHENTICATED_REQUESTS_PER_MINUTE,
    );
    if (throttled) return { ok: false, response: throttled };
    return {
      ok: false,
      response: json(
        {
          error: "unauthorized",
          message: "Provide Authorization: Bearer <api key>.",
        },
        401,
      ),
    };
  }

  const keyHash = await hashKey(token);

  // Key the limit on the hash so a caller cannot dodge it by rotating source IPs,
  // and so an invalid key is throttled before it can enumerate.
  const throttled = rateLimited(
    `key:${keyHash}`,
    AUTHENTICATED_REQUESTS_PER_MINUTE,
  );
  if (throttled) return { ok: false, response: throttled };

  const { data, error } = await supabaseAdmin
    .from("api_keys")
    .select("id,user_id,revoked_at")
    .eq("key_hash", keyHash)
    .maybeSingle();

  if (error) {
    const requestId = requestIdOf(request);
    logError(requestId, error, { stage: "api-key-lookup" });
    return { ok: false, response: internalError(requestId) };
  }

  if (!data || data.revoked_at) {
    return {
      ok: false,
      response: json(
        { error: "unauthorized", message: "Invalid or revoked API key." },
        401,
      ),
    };
  }

  // Best-effort telemetry: a failed touch must not fail the caller's request.
  void supabaseAdmin
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id)
    .then(({ error: touchError }) => {
      if (touchError)
        logError(requestIdOf(request), touchError, { stage: "api-key-touch" });
    });

  return { ok: true, userId: data.user_id };
}

function internalError(requestId: string) {
  return json(
    {
      error: "internal_error",
      message:
        "Something went wrong on our end. Retry, and quote the request id if it persists.",
      request_id: requestId,
    },
    500,
    { [REQUEST_ID_HEADER]: requestId },
  );
}

/**
 * Turns a thrown value into a response without leaking internals. Only
 * PublicError and Zod validation carry their detail to the caller; anything
 * else is logged with a request id and answered generically.
 */
export function failure(err: unknown, request?: Request) {
  if (err instanceof PublicError) {
    return json({ error: err.code, message: err.message }, err.status);
  }

  if (err instanceof ZodError) {
    return json(
      {
        error: "invalid_request",
        message: "Request body failed validation.",
        issues: err.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
      422,
    );
  }

  const requestId = request ? requestIdOf(request) : "unknown";
  logError(requestId, err, { stage: "public-api" });
  return internalError(requestId);
}
