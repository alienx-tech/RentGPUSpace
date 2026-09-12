"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Card } from "@/components/Card";
import { Button } from "@/components/ui/button";
import { gpuTypesQuery, offersQuery, templatesQuery } from "@/lib/queries";
import { inrPerHour, usdPerHour } from "@/lib/format";

export function HomeClient() {
  const { data: offers } = useQuery(offersQuery);
  const { data: gpus } = useQuery(gpuTypesQuery);
  const { data: templates } = useQuery(templatesQuery);

  const available = (offers ?? []).reduce(
    (sum, o) => sum + o.available_units,
    0,
  );
  const regions = new Set(
    (offers ?? []).map((o) => o.providers?.region).filter(Boolean),
  ).size;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main className="mx-auto w-full max-w-7xl px-5 py-8 md:py-12">
        <section className="relative isolate overflow-hidden border border-border bg-surface/80 px-6 py-10 md:px-10 md:py-14 lg:px-14">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,color-mix(in_oklab,var(--primary)_12%,transparent),transparent_38rem)]" />
          <div className="pointer-events-none absolute inset-0 -z-10 opacity-30 [background-image:linear-gradient(color-mix(in_oklab,var(--foreground)_6%,transparent)_1px,transparent_1px),linear-gradient(90deg,color-mix(in_oklab,var(--foreground)_6%,transparent)_1px,transparent_1px)] [background-size:24px_24px] [mask-image:linear-gradient(to_bottom,black,transparent)]" />

          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div className="space-y-8">
              <h1 className="max-w-3xl text-4xl leading-[1.02] tracking-[-0.045em] sm:text-5xl md:text-6xl">
                GPUs on demand.
                <span className="mt-1 block text-primary">
                  Billed by the minute.
                </span>
              </h1>

              <p className="max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
                Deploy an A100 or H100 in under 60 seconds. High-performance
                infrastructure built for machine learning engineers and data
                scientists — priced in rupees, stopped whenever you like.
              </p>

              <div className="flex flex-wrap gap-3">
                <Button
                  asChild
                  size="lg"
                  className="min-w-40 shadow-lg shadow-primary/15"
                >
                  <Link href="/gpus">Launch instance →</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="bg-background/40"
                >
                  <Link href="/pricing">View pricing</Link>
                </Button>
              </div>

              <div className="flex gap-8 border-t border-border pt-7">
                {[
                  ["GPUs available", available || 64],
                  ["Regions", regions || 4],
                  ["Billing unit", "60s"],
                ].map(([label, value]) => (
                  <div key={label}>
                    <div className="num text-lg text-primary">{value}</div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">
                      {label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative flex aspect-[4/3] w-full flex-col overflow-hidden border border-border bg-black/60 shadow-2xl shadow-black/40">
              <div className="flex h-8 shrink-0 items-center gap-2 border-b border-border bg-surface px-4">
                <span className="h-2.5 w-2.5 rounded-full bg-destructive/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-warning/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-success/70" />
                <span className="num mx-auto text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                  rentgpu-cli deploy
                </span>
              </div>

              <div className="flex grow flex-col justify-end overflow-hidden p-4 font-mono text-[11px] leading-6 text-muted-foreground sm:text-xs">
                <div>
                  $ rentgpu create --type H100 --count 8 --region blr-01
                </div>
                <div className="text-success">
                  [ OK ] Authenticated as you@lab.in
                </div>
                <div>
                  Allocating nodes…{" "}
                  <span className="text-foreground">done (1.2s)</span>
                </div>
                <div>
                  Provisioning NVMe storage…{" "}
                  <span className="text-foreground">done (2.4s)</span>
                </div>
                <div>
                  Attaching network interfaces…{" "}
                  <span className="text-foreground">done (0.8s)</span>
                </div>
                <div className="text-success">[ OK ] Cluster ready.</div>
                <div className="mt-2 text-foreground">Access details:</div>
                <div>IP: 10.42.7.100</div>
                <div>SSH: ssh -i ~/.ssh/gpu_key root@10.42.7.100</div>
                <div className="mt-2 flex items-center">
                  <span className="mr-2 text-success">➜</span>
                  <span className="typewriter">ssh root@cluster-01</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-6 flex items-center justify-between gap-4 border-b border-border pb-3">
          <p className="num text-xs text-muted-foreground">Live rate card</p>
          <Link
            href="/pricing"
            className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            See all pricing →
          </Link>
        </div>

        <div className="mt-4 stagger grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(gpus ?? []).map((g) => (
            <Card key={g.id} kicker={g.tier} stamp={`${g.vram_gb} GB`}>
              <h2 className="text-sm">{g.model}</h2>
              <p className="num mt-3 text-lg">
                {inrPerHour(g.price_inr_per_min_paise)}/hr
              </p>
              <p className="num mt-0.5 text-xs text-muted-foreground">
                {usdPerHour(g.price_inr_per_min_paise)}/hr
              </p>
            </Card>
          ))}
        </div>

        <section className="mt-16">
          <h2 className="text-lg">How you are charged</h2>
          <div className="mt-5 stagger grid gap-3 md:grid-cols-3">
            {[
              {
                k: "01",
                t: "Per minute, rounded up",
                d: "Compute stops the second the instance stops. Attached NVMe keeps billing until you terminate.",
              },
              {
                k: "02",
                t: "Wallet in INR",
                d: "UPI, Indian cards, net banking. Monthly GST invoices. USD on the rate card is a reference at ₹88/$.",
              },
              {
                k: "03",
                t: "Spend caps",
                d: "Set a rupee cap or an idle timer at deploy. Empty wallet also stops the box.",
              },
            ].map((c) => (
              <Card key={c.k} kicker={c.k}>
                <h3 className="text-sm">{c.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {c.d}
                </p>
              </Card>
            ))}
          </div>
        </section>

        <section className="stagger mt-16 grid gap-3 lg:grid-cols-2">
          <Card kicker="Supply" stamp="82 / 18 split">
            <h2 className="text-lg">Where the machines sit</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Every listing is a verified partner: KYC, datacentre audit,
              benchmark, network test, 72-hour burn-in. Providers keep 82% of
              metered revenue. Support is in IST.
            </p>
            <p className="mt-4 text-sm">
              <Link
                href="/providers"
                className="underline-offset-4 hover:underline"
              >
                Published supplier metrics
              </Link>
              {" · "}
              <Link
                href="/provider"
                className="underline-offset-4 hover:underline"
              >
                List idle GPUs
              </Link>
            </p>
          </Card>
          <Card
            kicker="Providers"
            footer={
              <Button asChild size="sm">
                <Link href="/provider">Apply to list capacity</Link>
              </Button>
            }
          >
            <h2 className="text-lg">Have idle GPUs in a rack?</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              We handle provisioning, metering, billing, payouts and support.
              Zero commission during onboarding.
            </p>
          </Card>
        </section>

        {(templates ?? []).length > 0 && (
          <section className="mt-16">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="text-lg">Images we boot</h2>
              <Link
                href="/docs"
                className="text-sm text-muted-foreground underline-offset-4 hover:underline"
              >
                Docs
              </Link>
            </div>
            <div className="mt-5 stagger grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(templates ?? []).map((t) => (
                <Card
                  key={t.id}
                  kicker={t.category ?? "image"}
                  stamp={`${t.min_vram_gb} GB min`}
                >
                  <h3 className="text-sm">{t.name}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {t.description}
                  </p>
                  <p className="num mt-3 text-[11px] text-muted-foreground">
                    {t.docker_image}
                  </p>
                </Card>
              ))}
            </div>
          </section>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
