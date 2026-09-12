"use client";

import { useQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Card } from "@/components/Card";
import { gpuTypesQuery, offersQuery } from "@/lib/queries";
import { GST_RATE, inr, inrPerHour, usdPerHour } from "@/lib/format";

export function PricingClient() {
  const { data: gpus } = useQuery(gpuTypesQuery);
  const { data: offers } = useQuery(offersQuery);

  const cheapest = new Map<string, number>();
  for (const o of offers ?? []) {
    const cur = cheapest.get(o.gpu_type_id);
    if (cur === undefined || o.price_inr_per_min_paise < cur)
      cheapest.set(o.gpu_type_id, o.price_inr_per_min_paise);
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-7xl px-5 py-14">
        <h1 className="text-2xl md:text-3xl">Pricing</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Billed every minute an instance is running. Stopped instances only pay
          for attached storage. GST at {Math.round(GST_RATE * 100)}% is added on
          invoices.
        </p>

        <div className="mt-10 overflow-x-auto border border-border">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-border text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">GPU</th>
                <th className="px-4 py-3 font-medium">VRAM</th>
                <th className="px-4 py-3 font-medium">Tier</th>
                <th className="px-4 py-3 text-right font-medium">₹ / min</th>
                <th className="px-4 py-3 text-right font-medium">₹ / hour</th>
                <th className="px-4 py-3 text-right font-medium">$ / hour</th>
                <th className="px-4 py-3 text-right font-medium">
                  Best partner rate
                </th>
              </tr>
            </thead>
            <tbody>
              {(gpus ?? []).map((g) => {
                const best = cheapest.get(g.id);
                return (
                  <tr
                    key={g.id}
                    className="border-t border-hairline hover:bg-secondary/30"
                  >
                    <td className="px-4 py-3 font-medium">{g.model}</td>
                    <td className="num px-4 py-3 text-muted-foreground">
                      {g.vram_gb} GB
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {g.tier}
                    </td>
                    <td className="num px-4 py-3 text-right">
                      {inr(g.price_inr_per_min_paise)}
                    </td>
                    <td className="num px-4 py-3 text-right">
                      {inrPerHour(g.price_inr_per_min_paise)}
                    </td>
                    <td className="num px-4 py-3 text-right text-muted-foreground">
                      {usdPerHour(g.price_inr_per_min_paise)}
                    </td>
                    <td className="num px-4 py-3 text-right text-muted-foreground">
                      {best ? `${inrPerHour(best)}/hr` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-10 stagger grid gap-3 md:grid-cols-3">
          {[
            {
              k: "Storage",
              d: "₹0.09 per GB per hour for attached NVMe volumes, charged whether the instance is running or stopped.",
            },
            {
              k: "Network",
              d: "Ingress is free. Egress up to 2 TB/month per instance is included, then ₹1.50 per GB.",
            },
            {
              k: "Idle protection",
              d: "Set a spend cap or auto-shutdown timer per instance. We stop the box before overspend.",
            },
          ].map((c) => (
            <Card key={c.k} kicker="Add-on">
              <h3 className="text-sm">{c.k}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{c.d}</p>
            </Card>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
