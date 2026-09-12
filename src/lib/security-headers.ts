// Response hardening applied to every document response in proxy.ts.
//
// The CSP is deliberately permissive about inline scripts and styles: Next's
// App Router injects an inline hydration script and Tailwind injects inline
// styles, and neither is nonce-able today. The directives that *are*
// tightened still remove the high-value attacks — third-party script
// origins, clickjacking, <base> injection, plugin embedding and form
// exfiltration to another host.

const GOOGLE_FONTS_STYLE = "https://fonts.googleapis.com";
const GOOGLE_FONTS_FILES = "https://fonts.gstatic.com";

function originOf(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url).origin;
  } catch {
    return undefined;
  }
}

/**
 * connect-src has to name every origin the browser talks to: Supabase REST,
 * auth and realtime. Realtime uses wss:// on the same host.
 */
function connectSources(): string[] {
  const supabase = originOf(
    process.env["SUPABASE_URL"] ?? process.env["NEXT_PUBLIC_SUPABASE_URL"],
  );
  if (!supabase) return ["'self'"];
  return ["'self'", supabase, supabase.replace(/^https:/, "wss:")];
}

// React dev mode uses eval() to reconstruct callstacks across environments;
// production React never does. Scope 'unsafe-eval' to non-production so the
// deployed CSP stays tight.
function scriptSrc(): string {
  const isProd = process.env["NODE_ENV"] === "production";
  return isProd
    ? "script-src 'self' 'unsafe-inline'"
    : "script-src 'self' 'unsafe-inline' 'unsafe-eval'";
}

function buildCsp(): string {
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    scriptSrc(),
    `style-src 'self' 'unsafe-inline' ${GOOGLE_FONTS_STYLE}`,
    `font-src 'self' data: ${GOOGLE_FONTS_FILES}`,
    "img-src 'self' data: blob: https:",
    `connect-src ${connectSources().join(" ")}`,
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "upgrade-insecure-requests",
  ].join("; ");
}

let cachedCsp: string | undefined;

function csp(): string {
  if (!cachedCsp) cachedCsp = buildCsp();
  return cachedCsp;
}

/**
 * Applied to documents only. API responses under /api/public are a bearer-token
 * API consumed by scripts, not browsers, and carry their own CORS headers.
 *
 * Mutates the given `Headers` in place rather than reconstructing a new
 * Response — proxy.ts calls this on a `NextResponse.next({request})`, whose
 * pass-through-to-the-matched-route signal would be lost if wrapped in a
 * fresh `Response`. A plain `Headers` mutation is the framework-neutral
 * cross-section: it works identically here and if it's ever needed against a
 * plain fetch `Response`.
 */
export function applySecurityHeaders(headers: Headers): void {
  headers.set("x-content-type-options", "nosniff");
  headers.set("referrer-policy", "strict-origin-when-cross-origin");
  headers.set("x-frame-options", "DENY");
  headers.set("cross-origin-opener-policy", "same-origin");
  headers.set(
    "permissions-policy",
    "camera=(), microphone=(), geolocation=(), payment=()",
  );
  // Only meaningful over TLS; harmless otherwise, and the proxy terminates TLS.
  headers.set(
    "strict-transport-security",
    "max-age=31536000; includeSubDomains",
  );
  if (!headers.has("content-security-policy"))
    headers.set("content-security-policy", csp());
}
