import "server-only";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./types";

/**
 * Refreshes the Supabase session cookie on every request. Server Components
 * can't write cookies themselves (see server.ts), so without this, an
 * expired access token would never get refreshed for a purely
 * server-rendered navigation — this is what keeps `createSupabaseServerClient`
 * seeing a current session.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const SUPABASE_URL = process.env["SUPABASE_URL"];
  const SUPABASE_PUBLISHABLE_KEY = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) return response;

  const supabase = createServerClient<Database>(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // Triggers a token refresh (and the setAll above) when the access token is
  // stale; a plain getSession() would only read the existing cookie.
  await supabase.auth.getClaims();

  return response;
}
