"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { AdminShell } from "@/components/admin/AdminShell";
import {
  RangeFilter,
  Stat,
  StatGrid,
  type Range,
} from "@/components/admin/primitives";
import { Card } from "@/components/Card";
import { overviewQuery } from "@/lib/admin-queries";
import { inr, pct } from "@/lib/format";

export function AdminDashboardClient() {
  const [range, setRange] = useState<Range>("7d");
  const { data, isLoading, error } = useQuery(overviewQuery(range));

  return (
    <AdminShell
      title="Operations dashboard"
      description="Platform health at a glance — supply, demand, revenue and the queues that need attention."
      actions={<RangeFilter value={range} onChange={setRange} />}
    >
      {error && (
        <Card kicker="error">
          <p className="text-sm text-destructive">{(error as Error).message}</p>
        </Card>
      )}

      {isLoading || !data ? (
        <p className="text-sm text-muted-foreground">
          Loading platform metrics…
        </p>
      ) : (
        <div className="space-y-6">
          <section>
            <SectionLabel>Supply</SectionLabel>
            <StatGrid>
              <Stat label="Total GPUs" value={data.gpus.total} />
              <Stat label="Available" value={data.gpus.available} />
              <Stat label="Rented" value={data.gpus.rented} />
              <Stat
                label="Utilization"
                value={pct(data.gpus.utilizationPct)}
                tone={data.gpus.utilizationPct > 90 ? "warn" : "default"}
                hint={
                  data.gpus.utilizationPct > 90 ? "Low headroom" : undefined
                }
              />
            </StatGrid>
          </section>

          <section>
            <SectionLabel>Demand</SectionLabel>
            <StatGrid>
              <Stat label="Running instances" value={data.instances.running} />
              <Stat
                label={`Started (${range})`}
                value={data.instances.startedInRange}
              />
              <Stat
                label={`Failed (${range})`}
                value={data.instances.failedInRange}
                tone={data.instances.failedInRange > 0 ? "bad" : "default"}
              />
              <Stat
                label={`Active customers (${range})`}
                value={data.users.active}
              />
            </StatGrid>
          </section>

          <section>
            <SectionLabel>Revenue</SectionLabel>
            <StatGrid>
              <Stat label="Today" value={inr(data.revenue.todayPaise)} />
              <Stat
                label={`Gross (${range})`}
                value={inr(data.revenue.rangePaise)}
              />
              <Stat
                label="Platform commission"
                value={inr(data.revenue.commissionPaise)}
              />
              <Stat
                label="Owed to providers"
                value={inr(data.revenue.payoutPaise)}
                hint="Accrued, not yet paid"
              />
            </StatGrid>
          </section>

          <section>
            <SectionLabel>Queues</SectionLabel>
            <StatGrid>
              <Stat label="Total users" value={data.users.total} />
              <Stat label="Providers" value={data.providers.total} />
              <Stat
                label="Awaiting verification"
                value={data.providers.pending}
                tone={data.providers.pending > 0 ? "warn" : "default"}
              />
              <Stat
                label="Open tickets"
                value={data.support.open}
                tone={data.support.open > 0 ? "warn" : "default"}
              />
            </StatGrid>
          </section>

          <Card kicker="charts">
            <p className="text-sm text-muted-foreground">
              Revenue, utilization and GPU-hour trend lines need a time series
              to plot. Instances carry{" "}
              <span className="num">accrued_paise</span> as a running total
              rather than per-interval samples, so a chart drawn from them today
              would be a single point. A metering snapshot table is what unlocks
              them.
            </p>
            <p className="mt-3 text-xs text-muted-foreground">
              The tiles above are live and exact — they read the same rows
              billing does.
            </p>
          </Card>

          <div className="flex flex-wrap gap-2 text-xs">
            <Jump href="/admin/instances" label="Instances" />
            <Jump href="/admin/gpus" label="GPU inventory" />
            <Jump href="/admin/verification" label="Verification queue" />
            <Jump href="/admin/billing" label="Billing" />
          </div>
        </div>
      )}
    </AdminShell>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="num mb-2 text-[10px] uppercase tracking-wider text-muted-foreground/60">
      {children}
    </p>
  );
}

function Jump({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="num border border-border px-2.5 py-1 text-muted-foreground transition-colors hover:text-foreground"
    >
      {label} →
    </Link>
  );
}
