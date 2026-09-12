"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brand } from "./Brand";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/gpus", label: "GPU'S" },
  { href: "/pricing", label: "Pricing" },
  { href: "/docs", label: "Docs" },
  { href: "/provider", label: "Supply" },
] as const;

export function SiteHeader() {
  const { user } = useAuth();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between gap-6 px-5">
        <Brand />
        <nav className="hidden items-center gap-6 md:flex">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                data-status={active ? "active" : undefined}
                className={cn(
                  "nav-link text-sm text-muted-foreground hover:text-foreground",
                  active && "text-foreground",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <Button asChild size="sm">
              <Link href="/dashboard">Console</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/auth">Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link
                  href={{
                    pathname: "/auth",
                    query: { mode: "signup", redirect: "/gpus" },
                  }}
                >
                  Create account
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
