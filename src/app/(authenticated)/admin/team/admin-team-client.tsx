"use client";

import { useQuery } from "@tanstack/react-query";

import { AdminShell } from "@/components/admin/AdminShell";
import { Cell, DataTable, Row } from "@/components/admin/primitives";
import { Card } from "@/components/Card";
import { myPermissionsQuery } from "@/lib/admin-queries";
import { PERMISSIONS, ROLE_LABELS } from "@/lib/permissions";

export function AdminTeamClient() {
  const { data: mine } = useQuery(myPermissionsQuery);
  const held = new Set(mine ?? []);

  return (
    <AdminShell
      title="Admin & roles"
      description="Which permissions each role carries. Roles are granted in the database; the console reads the same mapping RLS enforces."
    >
      <div className="space-y-4">
        <Card kicker="your access">
          <p className="text-sm">
            You hold <span className="num">{held.size}</span> of{" "}
            <span className="num">{PERMISSIONS.length}</span> permissions.
          </p>
          <div className="mt-3 flex flex-wrap gap-1">
            {PERMISSIONS.map((p) => (
              <span
                key={p}
                className={
                  "num border px-1.5 py-0.5 text-[10px] " +
                  (held.has(p)
                    ? "border-emerald-400/30 text-emerald-400"
                    : "border-border text-muted-foreground/40")
                }
              >
                {p}
              </span>
            ))}
          </div>
        </Card>

        <DataTable
          columns={[
            { key: "role", label: "Role" },
            { key: "scope", label: "Scope" },
          ]}
        >
          {Object.entries(ROLE_SCOPES).map(([role, scope]) => (
            <Row key={role}>
              <Cell>{ROLE_LABELS[role] ?? role}</Cell>
              <Cell muted className="text-xs">
                {scope}
              </Cell>
            </Row>
          ))}
        </DataTable>

        <div className="border border-dashed border-border bg-surface p-5">
          <p className="num text-[10px] uppercase tracking-wider text-amber-400">
            Granting is database-only for now
          </p>
          <p className="mt-2 max-w-2xl text-sm text-foreground">
            Roles are assigned by inserting into{" "}
            <span className="num">user_roles</span> with the service role.
            Granting from this page would be the single most dangerous button in
            the console — it can create another Super Admin — so it ships once
            there is a confirmation flow and its own audit action, not before.
          </p>
        </div>
      </div>
    </AdminShell>
  );
}

/** Mirrors the seed in the RBAC migration; kept short enough to read at a glance. */
const ROLE_SCOPES: Record<string, string> = {
  super_admin: "Everything, including granting roles.",
  operations_admin: "Capacity, nodes, instances and providers. No money.",
  finance_admin:
    "Billing, payouts, pricing and wallet credits. No capacity controls.",
  provider_manager:
    "Provider onboarding, verification and their payout visibility.",
  support_agent:
    "Read customers and instances, work the ticket queue. Cannot move money.",
  security_admin: "Risk signals, account suspension and the audit trail.",
  analyst: "Read-only across the platform. No risk or audit access.",
};
