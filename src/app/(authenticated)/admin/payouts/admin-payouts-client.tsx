"use client";

import { useQuery } from "@tanstack/react-query";

import { AdminShell } from "@/components/admin/AdminShell";
import {
  Cell,
  DataTable,
  Row,
  Stat,
  StatGrid,
} from "@/components/admin/primitives";
import { adminProvidersQuery } from "@/lib/admin-queries";
import { inr } from "@/lib/format";

const COLUMNS = [
  { key: "provider", label: "Provider" },
  { key: "region", label: "Region" },
  { key: "gpus", label: "GPUs", numeric: true },
  { key: "earned", label: "Accrued earnings", numeric: true },
  { key: "state", label: "State" },
];

export function AdminPayoutsClient() {
  const { data: providers, isLoading } = useQuery(adminProvidersQuery);
  const owed = (providers ?? []).reduce((n, p) => n + p.earningsPaise, 0);

  return (
    <AdminShell
      title="Provider payouts"
      description="What each provider has earned from customer spend, at their offers' payout rates."
    >
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="space-y-4">
          <StatGrid>
            <Stat label="Total accrued" value={inr(owed)} />
            <Stat
              label="Providers earning"
              value={
                (providers ?? []).filter((p) => p.earningsPaise > 0).length
              }
            />
            <Stat label="Paid this month" value="—" hint="No payouts ledger" />
            <Stat label="On hold" value="—" hint="No payouts ledger" />
          </StatGrid>

          <DataTable
            columns={COLUMNS}
            isEmpty={!providers?.length}
            empty="No providers yet."
          >
            {(providers ?? []).map((p) => (
              <Row key={p.id}>
                <Cell>{p.companyName}</Cell>
                <Cell muted className="text-xs">
                  {p.region} · {p.country}
                </Cell>
                <Cell numeric>{p.gpus}</Cell>
                <Cell numeric>{inr(p.earningsPaise)}</Cell>
                <Cell muted className="num text-[11px]">
                  accrued
                </Cell>
              </Row>
            ))}
          </DataTable>

          <div className="border border-dashed border-border bg-surface p-5">
            <p className="num text-[10px] uppercase tracking-wider text-amber-400">
              Read-only until a payouts ledger exists
            </p>
            <p className="mt-2 max-w-2xl text-sm text-foreground">
              Approve, hold and export are deliberately absent. The figures
              above are derived live from instance accrual — there is no record
              of what has already been paid, so an “approve payout” button would
              have nothing to write to and no way to stop the same money being
              paid twice.
            </p>
            <p className="mt-3 text-xs text-muted-foreground">
              Needs: a <span className="num">payouts</span> table (period,
              provider, gross, commission, payable, status, paid_at) and{" "}
              <span className="num">provider_payout_accounts</span> for
              destination details.
            </p>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
