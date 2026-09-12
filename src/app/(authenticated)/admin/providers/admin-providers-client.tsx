"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { AdminShell } from "@/components/admin/AdminShell";
import {
  Cell,
  DataTable,
  Row,
  Stat,
  StatGrid,
  StatusTag,
} from "@/components/admin/primitives";
import { adminProvidersQuery } from "@/lib/admin-queries";
import { inr, pct, relTime } from "@/lib/format";

const COLUMNS = [
  { key: "provider", label: "Provider" },
  { key: "region", label: "Region" },
  { key: "offers", label: "Offers", numeric: true },
  { key: "gpus", label: "GPUs", numeric: true },
  { key: "util", label: "Utilization", numeric: true },
  { key: "uptime", label: "Uptime", numeric: true },
  { key: "earnings", label: "Earned", numeric: true },
  { key: "status", label: "Status" },
  { key: "applied", label: "Applied", numeric: true },
];

export function AdminProvidersClient() {
  const { data: providers, isLoading } = useQuery(adminProvidersQuery);

  const pending = (providers ?? []).filter((p) => p.status !== "verified");
  const totalGpus = (providers ?? []).reduce((n, p) => n + p.gpus, 0);
  const owed = (providers ?? []).reduce((n, p) => n + p.earningsPaise, 0);

  return (
    <AdminShell
      title="Providers"
      description="Companies supplying GPU capacity. Earnings are accrued from customer spend at each offer's payout rate — what is owed, not what has been paid."
      actions={
        pending.length > 0 ? (
          <Link
            href="/admin/verification"
            className="num border border-amber-400/40 px-2.5 py-1 text-[11px] text-amber-400"
          >
            {pending.length} awaiting review →
          </Link>
        ) : null
      }
    >
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading providers…</p>
      ) : (
        <div className="space-y-4">
          <StatGrid>
            <Stat label="Providers" value={(providers ?? []).length} />
            <Stat
              label="Verified"
              value={
                (providers ?? []).filter((p) => p.status === "verified").length
              }
            />
            <Stat label="GPUs supplied" value={totalGpus} />
            <Stat label="Owed to providers" value={inr(owed)} />
          </StatGrid>

          <DataTable
            columns={COLUMNS}
            isEmpty={!providers?.length}
            empty="No providers yet."
          >
            {(providers ?? []).map((p) => {
              const used = p.gpus - p.availableGpus;
              return (
                <Row key={p.id}>
                  <Cell>{p.companyName}</Cell>
                  <Cell muted className="text-xs">
                    {p.region} · {p.country}
                  </Cell>
                  <Cell numeric>{p.offers}</Cell>
                  <Cell numeric>{p.gpus}</Cell>
                  <Cell numeric>
                    {p.gpus > 0 ? pct((used / p.gpus) * 100) : "—"}
                  </Cell>
                  <Cell numeric muted>
                    {p.uptimePct.toFixed(2)}%
                  </Cell>
                  <Cell numeric>{inr(p.earningsPaise)}</Cell>
                  <Cell>
                    <StatusTag value={p.status} />
                  </Cell>
                  <Cell numeric muted>
                    {relTime(p.createdAt)}
                  </Cell>
                </Row>
              );
            })}
          </DataTable>
        </div>
      )}
    </AdminShell>
  );
}
