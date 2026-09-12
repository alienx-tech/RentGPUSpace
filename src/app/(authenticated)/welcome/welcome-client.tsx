"use client";

import Link from "next/link";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { useTypedSearchParams } from "@/hooks/useTypedSearchParams";
import { safePath } from "@/lib/safe-path";
import { Brand } from "@/components/Brand";
import { Card } from "@/components/Card";
import { Button } from "@/components/ui/button";

const searchSchema = z.object({
  next: z.string().catch("/dashboard"),
});

export function WelcomeClient() {
  const { next } = useTypedSearchParams(searchSchema);
  const { user } = useAuth();
  const continueTo = safePath(next);
  const fullName = user?.user_metadata?.["full_name"];
  const firstName =
    typeof fullName === "string" ? fullName.split(" ")[0] : undefined;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border">
        <div className="mx-auto w-full max-w-7xl px-5 py-4">
          <Brand />
        </div>
      </header>
      <main className="mx-auto w-full max-w-sm flex-1 px-5 py-16">
        <Card kicker="Account ready">
          <h1 className="text-xl">
            Welcome{firstName ? `, ${firstName}` : ""}.
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Your account is set up with ₹500 compute credit. Deploy a GPU
            instance or head to your console.
          </p>
          <div className="mt-8 space-y-2">
            <Button asChild className="w-full">
              <Link href="/gpus">Deploy a GPU instance</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href={continueTo}>Go to console</Link>
            </Button>
          </div>
        </Card>
      </main>
    </div>
  );
}
