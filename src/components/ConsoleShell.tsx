"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Brand } from "./Brand";
import { Button } from "@/components/ui/button";
import { myRolesQuery, walletQuery } from "@/lib/queries";
import { inr } from "@/lib/format";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/dashboard", label: "Overview" },
  { href: "/instances", label: "Instances" },
  { href: "/wallet", label: "Wallet" },
  { href: "/api-keys", label: "API keys" },
  { href: "/support", label: "Support" },
] as const;

const adminNav = [
  { href: "/admin", label: "Ops console" },
  { href: "/verification", label: "Verification" },
] as const;

export function ConsoleShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  const { data: wallet } = useQuery(walletQuery);
  const { data: roles } = useQuery(myRolesQuery);
  const isAdmin = (roles ?? []).includes("admin");
  const { signOut, user } = useAuth();
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-5 py-3">
          <Brand compact />
          <div className="flex items-center gap-3">
            <Link
              href="/wallet"
              className="num text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              {wallet ? inr(wallet.balance_paise) : "₹—"}
            </Link>
            <Button asChild size="sm">
              <Link href="/gpus">Deploy</Link>
            </Button>
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={() => signOut()}
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl gap-10 px-5 py-8">
        <aside className="hidden w-40 shrink-0 md:block">
          <nav className="space-y-1">
            {nav.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  "nav-link block py-1.5 text-sm text-muted-foreground hover:text-foreground",
                  pathname === n.href && "text-foreground",
                )}
              >
                {n.label}
              </Link>
            ))}
          </nav>

          {isAdmin && (
            <nav className="mt-6 space-y-1 border-t border-border pt-4">
              <p className="num mb-1 text-[10px] uppercase tracking-wider text-muted-foreground/70">
                Platform
              </p>
              {adminNav.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className={cn(
                    "nav-link block py-1.5 text-sm text-muted-foreground hover:text-foreground",
                    pathname === n.href && "text-foreground",
                  )}
                >
                  {n.label}
                </Link>
              ))}
            </nav>
          )}

          <p className="mt-8 truncate text-[11px] text-muted-foreground/70">
            {user?.email}
          </p>
        </aside>

        <main className="min-w-0 flex-1">
          <h1 className="text-xl">{title}</h1>
          {description && (
            <p className="mt-1.5 text-sm text-muted-foreground">
              {description}
            </p>
          )}
          <div className="mt-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
