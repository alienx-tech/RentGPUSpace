import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";

export const isSupabaseConfigured =
  Boolean(process.env["NEXT_PUBLIC_SUPABASE_URL"]) &&
  Boolean(process.env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"]);

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request
        ? input.headers
        : undefined,
    );

    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) =>
        headers.set(key, value),
      );
    }

    // New Supabase API keys are opaque strings, not bearer JWTs.
    if (
      isNewSupabaseApiKey(supabaseKey) &&
      headers.get("Authorization") === `Bearer ${supabaseKey}`
    ) {
      headers.delete("Authorization");
    }

    headers.set("apikey", supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

function createSupabaseClient() {
  const SUPABASE_URL = process.env["NEXT_PUBLIC_SUPABASE_URL"];
  const SUPABASE_PUBLISHABLE_KEY =
    process.env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"];

  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    const missing = [
      ...(!SUPABASE_URL ? ["NEXT_PUBLIC_SUPABASE_URL"] : []),
      ...(!SUPABASE_PUBLISHABLE_KEY
        ? ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"]
        : []),
    ];
    const message = `Missing Supabase environment variable(s): ${missing.join(", ")}.`;
    console.error(`[Supabase] ${message}`);
    throw new Error(message);
  }

  // createBrowserClient stores the session in cookies itself (readable by the
  // server on the next request) — no custom storage adapter needed.
  return createBrowserClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: {
      fetch: createSupabaseFetch(SUPABASE_PUBLISHABLE_KEY),
    },
  });
}

let _supabase: ReturnType<typeof createSupabaseClient> | undefined;

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";
export const supabase = new Proxy(
  {} as ReturnType<typeof createSupabaseClient>,
  {
    get(_, prop, receiver) {
      if (!_supabase) _supabase = createSupabaseClient();
      return Reflect.get(_supabase, prop, receiver);
    },
  },
);
