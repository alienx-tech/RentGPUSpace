import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/integrations/supabase/server";
import { safePath } from "@/lib/safe-path";

// Google OAuth lands here (see GoogleAuthButton's redirectTo). Supabase's
// browser client (@supabase/ssr) uses PKCE, so — unlike the old app's
// implicit-flow client, which exchanged the token entirely client-side via
// detectSessionInUrl — the code has to be exchanged for a session here,
// server-side, so the session cookie can actually be written.
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const mode = url.searchParams.get("mode") === "signup" ? "signup" : "signin";
  const redirect = safePath(url.searchParams.get("redirect") ?? "/dashboard");
  const oauthError = url.searchParams.get("error");

  const authUrl = new URL("/auth", url.origin);
  authUrl.searchParams.set("mode", mode);
  authUrl.searchParams.set("redirect", redirect);

  if (oauthError) {
    authUrl.searchParams.set("error", oauthError);
    const description = url.searchParams.get("error_description");
    if (description) authUrl.searchParams.set("error_description", description);
    return NextResponse.redirect(authUrl);
  }

  if (!code) return NextResponse.redirect(authUrl);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    authUrl.searchParams.set("error", "exchange_failed");
    authUrl.searchParams.set("error_description", error.message);
    return NextResponse.redirect(authUrl);
  }

  // First-time signups (including Google) land on the welcome page rather
  // than going straight to `redirect`; it carries the original destination.
  const destination =
    mode === "signup"
      ? `/welcome?next=${encodeURIComponent(redirect)}`
      : redirect;
  return NextResponse.redirect(new URL(destination, url.origin));
}
