"use client";

import { useState } from "react";
import { toast } from "sonner";
import { isSupabaseConfigured, supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M21.6 12.23c0-.71-.06-1.4-.18-2.06H12v3.9h5.38a4.6 4.6 0 0 1-2 3.02v2.53h3.24c1.9-1.74 2.98-4.31 2.98-7.39Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.97-.9 6.62-2.38l-3.24-2.53c-.9.6-2.05.96-3.38.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.61A10 10 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.39 13.92A6.01 6.01 0 0 1 6.07 12c0-.67.11-1.32.32-1.92V7.47H3.04A10 10 0 0 0 2 12c0 1.61.39 3.14 1.04 4.53l3.35-2.61Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.95c1.47 0 2.79.5 3.83 1.5l2.87-2.88A9.63 9.63 0 0 0 12 2a10 10 0 0 0-8.96 5.47l3.35 2.61C7.18 7.71 9.39 5.95 12 5.95Z"
      />
    </svg>
  );
}

/**
 * Google OAuth entry point. Supabase owns the round trip: it redirects to
 * Google, then back to /auth/callback (PKCE code exchange — see that route),
 * which forwards to `redirect` on success.
 */
export function GoogleAuthButton({
  mode,
  redirect,
}: {
  mode: "signin" | "signup";
  redirect: string;
}) {
  const [busy, setBusy] = useState(false);
  const label =
    mode === "signup" ? "Sign up with Google" : "Sign in with Google";

  async function signIn() {
    if (!isSupabaseConfigured) {
      toast.error(
        "Supabase is not configured — Google sign-in is unavailable.",
      );
      return;
    }
    setBusy(true);
    // Carry the mode and destination through the round trip so the return leg
    // lands on this page with the same intent it left with.
    const search = new URLSearchParams({ mode, redirect });
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?${search.toString()}`,
        queryParams: { prompt: "select_account" },
      },
    });
    // A success navigates the tab away; only a failure resumes here.
    if (error) {
      toast.error(error.message);
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={signIn}
        disabled={busy}
        aria-busy={busy}
      >
        <GoogleMark />
        {busy ? "Redirecting to Google…" : label}
      </Button>
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="num text-[10px] uppercase text-muted-foreground">
          or use email
        </span>
        <span className="h-px flex-1 bg-border" />
      </div>
    </div>
  );
}
