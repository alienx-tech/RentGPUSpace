// One JSON line per request so a log pipeline can index status/duration/route
// without regex-scraping, plus a request id that is echoed to the client and
// attached to error responses so a user report maps to a log line.

import { describeError } from "./error-capture";

const ASSET_PATH =
  /\.(?:js|mjs|css|map|png|jpe?g|svg|webp|avif|ico|woff2?|txt|json|xml)$/i;

export const REQUEST_ID_HEADER = "x-request-id";

// A real `Request` (Route Handlers) satisfies this structurally, and so does
// the read-only `headers()` result from `next/headers` (Server Actions,
// Server Components) — neither context has the other's object available,
// and both only ever need `.get(name)`.
export type HeaderSource = { headers: { get(name: string): string | null } };

export function newRequestId(): string {
  return crypto.randomUUID();
}

export function requestIdOf(request: HeaderSource): string {
  // Trust the edge proxy's id when present so logs correlate across hops.
  return (
    request.headers.get(REQUEST_ID_HEADER) ??
    request.headers.get("cf-ray") ??
    newRequestId()
  );
}

type AccessLog = {
  requestId: string;
  method: string;
  path: string;
  status: number;
  durationMs: number;
};

export function logAccess({
  requestId,
  method,
  path,
  status,
  durationMs,
}: AccessLog): void {
  // Static assets are high-volume and low-signal; only log their failures.
  if (status < 400 && ASSET_PATH.test(path)) return;
  console.log(
    JSON.stringify({
      level: status >= 500 ? "error" : status >= 400 ? "warn" : "info",
      msg: "request",
      requestId,
      method,
      path,
      status,
      durationMs,
    }),
  );
}

export function logError(
  requestId: string,
  error: unknown,
  context: Record<string, unknown> = {},
): void {
  console.error(
    JSON.stringify({
      level: "error",
      msg: "unhandled",
      requestId,
      ...context,
      error: describeError(error),
    }),
  );
}
