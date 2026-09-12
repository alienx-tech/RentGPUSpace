"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ConsoleShell } from "@/components/ConsoleShell";
import { Card } from "@/components/Card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { instancesQuery, transactionsQuery, walletQuery } from "@/lib/queries";
import { inr, inrPerHour, relTime } from "@/lib/format";
import { runMetering } from "@/lib/rentgpu.functions";

export function DashboardClient() {
  const qc = useQueryClient();
  const { data: wallet } = useQuery(walletQuery);
  const { data: instances } = useQuery(instancesQuery);
  const { data: txns } = useQuery(transactionsQuery);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        await runMetering();
        if (!cancelled) {
          qc.invalidateQueries({ queryKey: ["wallet"] });
          qc.invalidateQueries({ queryKey: ["instances"] });
        }
      } catch {
        /* metering is best-effort */
      }
    };
    void tick();
    const id = setInterval(tick, 60000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [qc]);

  const running = (instances ?? []).filter((i) => i.status === "running");
  const burnPerMin = running.reduce((s, i) => s + i.price_inr_per_min_paise, 0);
  const runwayMin =
    burnPerMin > 0 && wallet
      ? Math.floor(wallet.balance_paise / burnPerMin)
      : null;

  return (
    <ConsoleShell
      title="Overview"
      description="Live spend, running capacity and wallet health."
    >
      <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Wallet balance"
          value={wallet ? inr(wallet.balance_paise) : "—"}
          accent
        />
        <Stat label="Running instances" value={String(running.length)} />
        <Stat
          label="Burn rate"
          value={burnPerMin ? `${inrPerHour(burnPerMin)}/hr` : "₹0.00/hr"}
        />
        <Stat
          label="Runway at current burn"
          value={
            runwayMin === null
              ? "∞"
              : `${Math.floor(runwayMin / 60)}h ${runwayMin % 60}m`
          }
        />
      </div>

      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-sm text-muted-foreground">Instances</h2>
          <Button asChild size="sm" variant="ghost">
            <Link href="/instances">View all →</Link>
          </Button>
        </div>
        <Card kicker="Fleet" padded={false} className="mt-3">
          {(instances ?? []).slice(0, 5).map((i) => (
            <Link
              key={i.id}
              href={`/instances/${i.id}`}
              className="flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-secondary/40"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{i.name}</p>
                <p className="num truncate text-xs text-muted-foreground">
                  {i.provider_offers?.gpu_types?.model} ·{" "}
                  {i.provider_offers?.providers?.region}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <span className="num hidden text-xs text-muted-foreground sm:block">
                  {inr(i.accrued_paise)} spent
                </span>
                <StatusBadge status={i.status} />
              </div>
            </Link>
          ))}
          {!instances?.length && (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              No instances yet.{" "}
              <Link href="/gpus" className="text-primary hover:underline">
                Deploy your first GPU
              </Link>
            </p>
          )}
        </Card>
      </section>

      <section className="mt-8">
        <h2 className="text-sm text-muted-foreground">
          Recent wallet activity
        </h2>
        <Card padded={false} className="mt-3">
          {(txns ?? []).slice(0, 6).map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between px-4 py-3 text-sm"
            >
              <div>
                <p>{t.description || t.kind}</p>
                <p className="text-xs text-muted-foreground">
                  {relTime(t.created_at)}
                </p>
              </div>
              <span
                className={`num ${t.kind === "credit" ? "text-primary" : "text-muted-foreground"}`}
              >
                {t.kind === "credit" ? "+" : "−"}
                {inr(Math.abs(t.amount_paise))}
              </span>
            </div>
          ))}
          {!txns?.length && (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              No activity yet.
            </p>
          )}
        </Card>
      </section>
    </ConsoleShell>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <Card kicker={label}>
      <p
        className={`num text-xl ${accent ? "text-primary" : "text-foreground"}`}
      >
        {value}
      </p>
    </Card>
  );
}
