import "server-only";

// Fail loudly instead of serving a site where every request 500s on the
// first Supabase call.

const REQUIRED_IN_PRODUCTION = [
  "SUPABASE_URL",
  "SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

export function assertProductionEnv(): void {
  if (process.env["NODE_ENV"] !== "production") return;

  const missing = REQUIRED_IN_PRODUCTION.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    fail(
      `missing required environment variable(s): ${missing.join(", ")}. ` +
        `Set them on the deployment before starting the server.`,
    );
  }

  assertPublishableKeyIsNotSecret();
}

/**
 * A `sb_secret_` key in the publishable slot is a credential leak, not a typo.
 * The publishable value is compiled into the browser bundle, so a secret key
 * there is served to every visitor and bypasses RLS. Supabase blocks it at the
 * edge with "Forbidden use of secret API key in browser", which surfaces to
 * users as a login failure — the symptom, not the cause. Refuse to start.
 */
function assertPublishableKeyIsNotSecret(): void {
  const publishable = process.env["SUPABASE_PUBLISHABLE_KEY"] ?? "";
  if (!publishable.startsWith("sb_secret_")) return;

  fail(
    "SUPABASE_PUBLISHABLE_KEY holds a secret (sb_secret_) key. That value is " +
      "compiled into the browser bundle and bypasses row-level security. " +
      "Set the publishable (sb_publishable_) key here, put the secret in " +
      "SUPABASE_SERVICE_ROLE_KEY, and rotate the exposed key.",
  );
}

function fail(message: string): never {
  process.stderr.write(`Refusing to start: ${message}\n`);
  process.exit(1);
}
