"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTypedSearchParams } from "@/hooks/useTypedSearchParams";
import { Brand } from "@/components/Brand";
import { GoogleAuthButton } from "@/components/GoogleAuthButton";
import { Card } from "@/components/Card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { safePath } from "@/lib/safe-path";

const searchSchema = z.object({
  mode: z.enum(["signin", "signup"]).catch("signin"),
  redirect: z.string().catch("/dashboard"),
});

export function AuthClient() {
  const { mode, redirect } = useTypedSearchParams(searchSchema);
  const router = useRouter();
  const pathname = usePathname();
  const { session, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const isSignup = mode === "signup";
  const target = safePath(redirect);
  // First-time signups land on an onboarding welcome page instead of going
  // straight to `target`; it carries the original destination forward.
  const welcomeTarget = `/welcome?next=${encodeURIComponent(target)}`;

  useEffect(() => {
    if (!loading && session) router.push(isSignup ? welcomeTarget : target);
  }, [loading, session, isSignup, welcomeTarget, target, router]);

  // OAuth failures come back as ?error=... / #error=... on this same URL.
  // The typed search schema drops unknown keys, so read the raw location instead.
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const code = query.get("error") || hash.get("error");
    if (!code) return;
    const detail =
      query.get("error_description") || hash.get("error_description");
    toast.error(
      code === "access_denied"
        ? "Google sign-in was cancelled."
        : detail?.replace(/\+/g, " ") ||
            "Google sign-in failed. Please try again.",
    );
    const clean = new URL(window.location.href);
    for (const key of ["error", "error_code", "error_description"])
      clean.searchParams.delete(key);
    clean.hash = "";
    window.history.replaceState({}, "", clean.toString());
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (isSignup) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}${welcomeTarget}`,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        // Supabase returns a decoy user with no identities when the address is
        // already registered, rather than leaking that it exists.
        if (data.user && data.user.identities?.length === 0) {
          toast.error("That address is already registered. Sign in instead.");
          setBusy(false);
        } else if (data.session) {
          toast.success("Account created.");
          // Navigate immediately instead of waiting on the auth-state-change
          // round trip (the `session` effect below still covers OAuth/other
          // entry paths) — keeps the button disabled straight through the
          // transition instead of flashing back to enabled first.
          router.push(welcomeTarget);
        } else {
          setSentTo(email);
          setBusy(false);
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push(target);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border">
        <div className="mx-auto w-full max-w-7xl px-5 py-4">
          <Brand />
        </div>
      </header>
      <main className="mx-auto w-full max-w-sm flex-1 px-5 py-16">
        {sentTo ? (
          <Card kicker="Confirm your email">
            <h1 className="text-xl">Check your inbox</h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              We sent a confirmation link to{" "}
              <span className="num text-foreground">{sentTo}</span>. Open it to
              finish creating your account — you cannot sign in until you do.
            </p>
            <p className="mt-6 text-sm">
              <button
                type="button"
                onClick={() => setSentTo(null)}
                className="text-foreground underline-offset-4 hover:underline"
              >
                Use a different address
              </button>
            </p>
          </Card>
        ) : (
          <Card kicker={isSignup ? "New account" : "Sign in"}>
            <h1 className="text-xl">
              {isSignup ? "Create an account" : "Sign in"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {isSignup
                ? "New accounts receive ₹500 compute credit."
                : "Instances, wallet and invoices."}
            </p>

            <div className="mt-8">
              <GoogleAuthButton mode={mode} redirect={target} />
            </div>

            <form onSubmit={onSubmit} className="mt-4 space-y-4">
              {isSignup && (
                <div className="space-y-1.5">
                  <Label htmlFor="name">Full name</Label>
                  <Input
                    id="name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email">Work email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {isSignup ? "Create account" : "Sign in"}
              </Button>
            </form>

            <p className="mt-6 text-sm text-muted-foreground">
              {isSignup ? "Already registered?" : "No account yet?"}{" "}
              <Link
                href={{
                  pathname,
                  query: {
                    mode: isSignup ? "signin" : "signup",
                    redirect: target,
                  },
                }}
                className="text-foreground underline-offset-4 hover:underline"
              >
                {isSignup ? "Sign in" : "Create one"}
              </Link>
            </p>
          </Card>
        )}
      </main>
    </div>
  );
}
