"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { Brand } from "../Brand";
import { Card } from "../Card";
import { useAuth } from "@/hooks/useAuth";
import { myPermissionsQuery } from "@/lib/admin-queries";
import type { Permission } from "@/lib/permissions";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; needs: Permission };
type NavGroup = { heading: string; items: NavItem[] };

/**
 * The sidebar from the console spec. Each entry declares the permission it
 * needs; a group with nothing visible disappears rather than rendering an
 * empty heading. This is presentation only — the database enforces the same
 * permission again on every read and write.
 */
const NAV: NavGroup[] = [
  {
    heading: "Overview",
    items: [{ href: "/admin", label: "Dashboard", needs: "admin.access" }],
  },
  {
    heading: "Marketplace",
    items: [
      { href: "/admin/gpus", label: "GPU Inventory", needs: "gpus.read" },
      { href: "/admin/nodes", label: "Nodes", needs: "nodes.read" },
      { href: "/admin/providers", label: "Providers", needs: "providers.read" },
      {
        href: "/admin/verification",
        label: "Verification",
        needs: "providers.verify",
      },
    ],
  },
  {
    heading: "Compute",
    items: [
      { href: "/admin/instances", label: "Instances", needs: "instances.read" },
      {
        href: "/admin/deployments",
        label: "Deployments",
        needs: "instances.read",
      },
    ],
  },
  {
    heading: "Customers",
    items: [
      { href: "/admin/users", label: "Users", needs: "users.read" },
      { href: "/admin/support", label: "Support", needs: "support.read" },
    ],
  },
  {
    heading: "Finance",
    items: [
      { href: "/admin/billing", label: "Billing", needs: "billing.read" },
      {
        href: "/admin/payouts",
        label: "Provider Payouts",
        needs: "payouts.read",
      },
      { href: "/admin/pricing", label: "Pricing", needs: "pricing.read" },
    ],
  },
  {
    heading: "Platform",
    items: [
      {
        href: "/admin/health",
        label: "Platform Health",
        needs: "admin.access",
      },
    ],
  },
  {
    heading: "Security",
    items: [
      { href: "/admin/audit-logs", label: "Audit Logs", needs: "audit.read" },
      { href: "/admin/team", label: "Admin & Roles", needs: "team.write" },
    ],
  },
];

export function AdminShell({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const { data: permissions, isLoading } = useQuery(myPermissionsQuery);
  const { user, signOut } = useAuth();
  const pathname = usePathname();

  const held = new Set(permissions ?? []);
  const groups = NAV.map((g) => ({
    ...g,
    items: g.items.filter((i) => held.has(i.needs)),
  })).filter((g) => g.items.length > 0);

  if (isLoading) return <Gate>Checking access…</Gate>;

  if (!held.has("admin.access")) {
    return (
      <Gate>
        This console is restricted to RentGPU platform staff. If you should have
        access, ask a Super Admin to grant you a role.
      </Gate>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background">
        <div className="mx-auto flex w-full max-w-[92rem] items-center justify-between gap-4 px-5 py-3">
          <div className="flex items-center gap-3">
            <Brand compact />
            <span className="num rounded-sm border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
              OPS
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Customer view
            </Link>
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

      <div className="mx-auto flex w-full max-w-[92rem] gap-8 px-5 py-8">
        <aside className="hidden w-48 shrink-0 lg:block">
          {groups.map((group) => (
            <nav key={group.heading} className="mb-5">
              <p className="num mb-1.5 text-[10px] uppercase tracking-wider text-muted-foreground/60">
                {group.heading}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active =
                    item.href === "/admin"
                      ? pathname === item.href
                      : pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "nav-link block border-l border-transparent py-1 pl-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground",
                        active && "border-primary text-foreground",
                      )}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </nav>
          ))}
          <p className="mt-6 truncate border-t border-border pt-3 text-[11px] text-muted-foreground/70">
            {user?.email}
          </p>
        </aside>

        <main className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-xl">{title}</h1>
              {description && (
                <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
                  {description}
                </p>
              )}
            </div>
            {actions}
          </div>
          <div className="mt-6">{children}</div>
        </main>
      </div>
    </div>
  );
}

function Gate({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <Card kicker="rentgpu ops">
          <p className="text-sm text-muted-foreground">{children}</p>
        </Card>
      </div>
    </div>
  );
}

/** Renders children only when the signed-in admin holds the permission. */
export function IfPermitted({
  permission,
  children,
  fallback = null,
}: {
  permission: Permission;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { data: permissions } = useQuery(myPermissionsQuery);
  return (permissions ?? []).includes(permission) ? (
    <>{children}</>
  ) : (
    <>{fallback}</>
  );
}
