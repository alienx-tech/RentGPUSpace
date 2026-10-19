import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The CSP is cached per secure/insecure key at module scope, so each test
 * imports a fresh copy of the module. That also lets a test set
 * SUPABASE_URL before the cache is primed.
 */
type Applied = {
  csp: string | null;
  hsts: string | null;
  nosniff: string | null;
  frameOptions: string | null;
  referrer: string | null;
  coop: string | null;
  permissions: string | null;
};

async function applyTo(request: NextRequest): Promise<Applied> {
  const { applySecurityHeaders } = await import("./security-headers");
  const headers = new Headers();
  applySecurityHeaders(headers, request);
  return {
    csp: headers.get("content-security-policy"),
    hsts: headers.get("strict-transport-security"),
    nosniff: headers.get("x-content-type-options"),
    frameOptions: headers.get("x-frame-options"),
    referrer: headers.get("referrer-policy"),
    coop: headers.get("cross-origin-opener-policy"),
    permissions: headers.get("permissions-policy"),
  };
}

function request(url: string, headers: Record<string, string> = {}) {
  return new NextRequest(url, { headers });
}

beforeEach(() => {
  vi.resetModules();
});

describe("applySecurityHeaders", () => {
  it("always sets the transport-independent hardening headers", async () => {
    const applied = await applyTo(request("http://example.test/dashboard"));

    expect(applied.nosniff).toBe("nosniff");
    expect(applied.frameOptions).toBe("DENY");
    expect(applied.referrer).toBe("strict-origin-when-cross-origin");
    expect(applied.coop).toBe("same-origin");
    expect(applied.permissions).toBe(
      "camera=(), microphone=(), geolocation=(), payment=()",
    );
  });

  it("sets the baseline CSP directives regardless of transport", async () => {
    const applied = await applyTo(request("http://example.test/"));

    for (const directive of [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "worker-src 'self' blob:",
      "manifest-src 'self'",
    ]) {
      expect(applied.csp).toContain(directive);
    }
  });

  it("leaves an existing CSP header untouched", async () => {
    const { applySecurityHeaders } = await import("./security-headers");
    const headers = new Headers({ "content-security-policy": "default-src *" });

    applySecurityHeaders(headers, request("http://example.test/"));

    expect(headers.get("content-security-policy")).toBe("default-src *");
  });

  describe("over plain HTTP", () => {
    // Regression: both of these used to be emitted unconditionally, which
    // broke a deployment that terminates on plain HTTP — every subresource
    // was upgraded to https:// and failed to load.
    it("omits upgrade-insecure-requests and HSTS with no forwarded proto", async () => {
      const applied = await applyTo(request("http://example.test/"));

      expect(applied.csp).not.toContain("upgrade-insecure-requests");
      expect(applied.hsts).toBeNull();
    });

    it("omits them when x-forwarded-proto is http", async () => {
      const applied = await applyTo(
        request("http://example.test/", { "x-forwarded-proto": "http" }),
      );

      expect(applied.csp).not.toContain("upgrade-insecure-requests");
      expect(applied.hsts).toBeNull();
    });

    it("omits them when the first hop of a forwarded chain is http", async () => {
      const applied = await applyTo(
        request("http://example.test/", {
          "x-forwarded-proto": "http, https",
        }),
      );

      expect(applied.csp).not.toContain("upgrade-insecure-requests");
      expect(applied.hsts).toBeNull();
    });

    it("ignores the request URL's own scheme once a proto is forwarded", async () => {
      // A TLS-terminating proxy that forwards plain HTTP inward is the case
      // that matters: the forwarded header, not the inner URL, decides.
      const applied = await applyTo(
        request("https://example.test/", { "x-forwarded-proto": "http" }),
      );

      expect(applied.csp).not.toContain("upgrade-insecure-requests");
      expect(applied.hsts).toBeNull();
    });
  });

  describe("over HTTPS", () => {
    it("sets both when x-forwarded-proto is https", async () => {
      const applied = await applyTo(
        request("http://example.test/", { "x-forwarded-proto": "https" }),
      );

      expect(applied.csp).toContain("upgrade-insecure-requests");
      expect(applied.hsts).toBe("max-age=31536000; includeSubDomains");
    });

    it("sets both when the first hop of a forwarded chain is https", async () => {
      const applied = await applyTo(
        request("http://example.test/", {
          "x-forwarded-proto": "https, http",
        }),
      );

      expect(applied.csp).toContain("upgrade-insecure-requests");
      expect(applied.hsts).toBe("max-age=31536000; includeSubDomains");
    });

    it("tolerates whitespace around the forwarded value", async () => {
      const applied = await applyTo(
        request("http://example.test/", { "x-forwarded-proto": "  https  " }),
      );

      expect(applied.csp).toContain("upgrade-insecure-requests");
      expect(applied.hsts).toBe("max-age=31536000; includeSubDomains");
    });

    it("falls back to the request URL for a direct https connection", async () => {
      const applied = await applyTo(request("https://example.test/"));

      expect(applied.csp).toContain("upgrade-insecure-requests");
      expect(applied.hsts).toBe("max-age=31536000; includeSubDomains");
    });
  });

  describe("connect-src", () => {
    it("is self-only when no Supabase URL is configured", async () => {
      vi.stubEnv("SUPABASE_URL", "");
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");

      const applied = await applyTo(request("http://example.test/"));

      expect(applied.csp).toContain("connect-src 'self';");
      vi.unstubAllEnvs();
    });

    it("names the Supabase origin and its websocket origin", async () => {
      vi.stubEnv("SUPABASE_URL", "https://abc.supabase.co/rest/v1");

      const applied = await applyTo(request("http://example.test/"));

      expect(applied.csp).toContain(
        "connect-src 'self' https://abc.supabase.co wss://abc.supabase.co",
      );
      vi.unstubAllEnvs();
    });

    it("ignores an unparseable Supabase URL", async () => {
      vi.stubEnv("SUPABASE_URL", "not-a-url");
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");

      const applied = await applyTo(request("http://example.test/"));

      expect(applied.csp).toContain("connect-src 'self';");
      vi.unstubAllEnvs();
    });
  });
});
