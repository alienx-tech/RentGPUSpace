"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ConsoleShell } from "@/components/ConsoleShell";
import { Card } from "@/components/Card";
import { Button } from "@/components/ui/button";
import {
  offersQuery,
  oneClickTemplatesQuery,
  walletQuery,
} from "@/lib/queries";
import { launchTemplate } from "@/lib/rentgpu.functions";
import { inr } from "@/lib/format";

export function LaunchClient() {
  const qc = useQueryClient();
  const router = useRouter();
  const { data: templates } = useQuery(oneClickTemplatesQuery);
  const { data: offers } = useQuery(offersQuery);
  const { data: wallet } = useQuery(walletQuery);
  const [busy, setBusy] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (slug: string) => launchTemplate({ slug, name: "" }),
    onSuccess: (res) => {
      void qc.invalidateQueries({ queryKey: ["instances"] });
      void qc.invalidateQueries({ queryKey: ["offers"] });
      void qc.invalidateQueries({ queryKey: ["wallet"] });
      toast.success(`${res.template} booting on ${res.gpu}`);
      router.push(`/instances/${res.id}`);
    },
    onError: (e: Error) => toast.error(e.message),
    onSettled: () => setBusy(null),
  });

  function cheapestFor(minVram: number) {
    return (offers ?? [])
      .filter(
        (o) => o.available_units > 0 && (o.gpu_types?.vram_gb ?? 0) >= minVram,
      )
      .sort((a, b) => a.price_inr_per_min_paise - b.price_inr_per_min_paise)[0];
  }

  return (
    <ConsoleShell
      title="Templates"
      description="We pick the cheapest free GPU that meets the VRAM floor and boot the image."
    >
      <div className="stagger grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {(templates ?? []).map((t) => {
          const offer = cheapestFor(t.min_vram_gb);
          const disabled = !offer || mutation.isPending;
          return (
            <Card
              key={t.id}
              kicker={t.category ?? "template"}
              stamp={`${t.min_vram_gb} GB min`}
              footer={
                <Button
                  size="sm"
                  disabled={disabled}
                  onClick={() => {
                    setBusy(t.slug);
                    mutation.mutate(t.slug);
                  }}
                >
                  {busy === t.slug && mutation.isPending
                    ? "Deploying…"
                    : "Deploy"}
                </Button>
              }
            >
              <h2 className="text-sm">{t.name}</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {t.blurb || t.description}
              </p>
              <p className="num mt-4 text-xs text-muted-foreground">
                {offer
                  ? `${offer.gpu_types?.model} · ${offer.providers?.region} · ${inr(
                      offer.price_inr_per_min_paise,
                    )}/min`
                  : "No matching GPU free"}
              </p>
              <p className="num mt-1 text-xs text-muted-foreground">
                {t.default_storage_gb} GB NVMe · stop after{" "}
                {t.default_auto_shutdown_minutes} min
              </p>
              {t.launch_hint ? (
                <code className="num mt-3 block text-[11px] text-muted-foreground">
                  {t.launch_hint}
                </code>
              ) : null}
            </Card>
          );
        })}
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Wallet {wallet ? inr(wallet.balance_paise) : "—"}. Billing starts when
        the instance is running.
      </p>
    </ConsoleShell>
  );
}
