"use client";

import { useQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Card } from "@/components/Card";
import { publicProvidersQuery } from "@/lib/queries";
import { inr } from "@/lib/format";

export function ProvidersClient() {
  const { data: providers } = useQuery(publicProvidersQuery);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-7xl px-5 py-12">
        <h1 className="text-2xl md:text-3xl">Suppliers</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          KYC, datacentre audit, hardware benchmark, network and storage test,
          72-hour burn-in. Numbers below are published per supplier.
        </p>

        <div className="mt-10 stagger grid gap-3 lg:grid-cols-2">
          {(providers ?? []).map((p) => {
            const offers = p.provider_offers ?? [];
            const live = offers.filter((o) => o.active);
            const events = [...(p.provider_verification_events ?? [])].sort(
              (a, b) => a.created_at.localeCompare(b.created_at),
            );
            const cheapest = live
              .map((o) => o.price_inr_per_min_paise)
              .sort((a, b) => a - b)[0];

            return (
              <Card
                key={p.id}
                kicker={`${p.region} · ${p.country}`}
                stamp={`${p.datacentre_tier} · verified`}
              >
                <h2 className="text-base">{p.company_name}</h2>

                <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
                  <Metric
                    label="Uptime"
                    value={`${Number(p.uptime_pct).toFixed(2)}%`}
                  />
                  <Metric
                    label="Benchmark"
                    value={p.benchmark_score ? String(p.benchmark_score) : "—"}
                  />
                  <Metric label="Network" value={`${p.network_gbps} Gbps`} />
                  <Metric
                    label="NVMe r/w"
                    value={
                      p.storage_read_mbps
                        ? `${p.storage_read_mbps}/${p.storage_write_mbps} MB/s`
                        : "—"
                    }
                  />
                  <Metric
                    label="Provision"
                    value={
                      p.avg_provision_seconds
                        ? `${p.avg_provision_seconds}s`
                        : "—"
                    }
                  />
                  <Metric
                    label="Incidents (30d)"
                    value={String(p.incidents_30d ?? 0)}
                  />
                </dl>

                {events.length > 0 && (
                  <ul className="mt-4 space-y-1 text-xs text-muted-foreground">
                    {events.map((e, i) => (
                      <li key={`${e.stage}-${i}`}>
                        <span className="text-foreground capitalize">
                          {e.stage.replace("_", " ")}
                        </span>
                        {" — "}
                        {e.status}. {e.notes}
                      </li>
                    ))}
                  </ul>
                )}

                <p className="num mt-4 text-xs text-muted-foreground">
                  {live.length} live offers ·{" "}
                  {live.reduce((n, o) => n + o.available_units, 0)} of{" "}
                  {live.reduce((n, o) => n + o.total_units, 0)} GPUs free
                  {cheapest ? ` · from ${inr(cheapest)}/min` : ""}
                  {live.length
                    ? ` · ${live
                        .map((o) => o.gpu_types?.model)
                        .filter(Boolean)
                        .join(", ")}`
                    : ""}
                </p>
              </Card>
            );
          })}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="num mt-0.5">{value}</dd>
    </div>
  );
}
