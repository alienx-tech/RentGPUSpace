"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { AdminShell, IfPermitted } from "@/components/admin/AdminShell";
import {
  Cell,
  DataTable,
  Row,
  Stat,
  StatGrid,
} from "@/components/admin/primitives";
import { Card } from "@/components/Card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminInventoryQuery } from "@/lib/admin-queries";
import { supabase } from "@/integrations/supabase/client";
import { gpuTypesQuery } from "@/lib/queries";
import { USD_PER_INR, inr, inrPerHour, usdPerHour } from "@/lib/format";

type CatalogueDraft = {
  model: string;
  vram_gb: number;
  tier: string;
  price_inr_per_min_paise: number;
  sort_order: number;
};

const MARGIN_COLUMNS = [
  { key: "gpu", label: "GPU" },
  { key: "provider", label: "Provider" },
  { key: "customer", label: "Customer price/hr", numeric: true },
  { key: "payout", label: "Provider share", numeric: true },
  { key: "fee", label: "Platform fee", numeric: true },
  { key: "rate", label: "Commission", numeric: true },
];

export function AdminPricingClient() {
  const { data: offers } = useQuery(adminInventoryQuery);

  const live = (offers ?? []).filter((o) => o.active);
  const avgCommission = live.length
    ? live.reduce((n, o) => n + (1 - o.payoutRate), 0) / live.length
    : 0;

  return (
    <AdminShell
      title="Pricing"
      description="The published rate card, and the commission each live offer earns the platform."
    >
      <div className="space-y-6">
        <StatGrid>
          <Stat label="Live offers" value={live.length} />
          <Stat
            label="Avg commission"
            value={`${(avgCommission * 100).toFixed(1)}%`}
          />
          <Stat
            label="Cheapest"
            value={
              live.length
                ? `${inrPerHour(Math.min(...live.map((o) => o.pricePaisePerMin)))}/hr`
                : "—"
            }
          />
          <Stat
            label="Dearest"
            value={
              live.length
                ? `${inrPerHour(Math.max(...live.map((o) => o.pricePaisePerMin)))}/hr`
                : "—"
            }
          />
        </StatGrid>

        <section>
          <h2 className="mb-2 text-sm">Margin by offer</h2>
          <DataTable
            columns={MARGIN_COLUMNS}
            isEmpty={!live.length}
            empty="No live offers."
          >
            {live.map((o) => {
              const hourly = o.pricePaisePerMin * 60;
              const payout = Math.round(hourly * o.payoutRate);
              return (
                <Row key={o.id}>
                  <Cell>{o.gpu}</Cell>
                  <Cell muted className="text-xs">
                    {o.provider} · {o.region}
                  </Cell>
                  <Cell numeric>{inr(hourly)}</Cell>
                  <Cell numeric muted>
                    {inr(payout)}
                  </Cell>
                  <Cell numeric>{inr(hourly - payout)}</Cell>
                  <Cell numeric>{((1 - o.payoutRate) * 100).toFixed(1)}%</Cell>
                </Row>
              );
            })}
          </DataTable>
          <p className="mt-2 text-xs text-muted-foreground">
            Per-offer prices are edited on{" "}
            <span className="num">GPU inventory</span>. Marketplace-wide floors,
            ceilings, region multipliers and spot discounts need a pricing-rules
            table; today commission lives per offer as{" "}
            <span className="num">payout_rate</span>.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-sm">Catalogue rate card</h2>
          <p className="mb-3 text-xs text-muted-foreground">
            The reference price for each GPU class. Offers are priced relative
            to this. The USD column is recalculated on save at ₹
            {(1 / USD_PER_INR).toFixed(0)}/$.
          </p>
          <IfPermitted
            permission="pricing.write"
            fallback={<CatalogueReadOnly />}
          >
            <CatalogueEditor />
          </IfPermitted>
        </section>
      </div>
    </AdminShell>
  );
}

function CatalogueReadOnly() {
  const { data: gpus } = useQuery(gpuTypesQuery);
  return (
    <DataTable
      columns={[
        { key: "gpu", label: "GPU" },
        { key: "tier", label: "Tier" },
        { key: "vram", label: "VRAM", numeric: true },
        { key: "inr", label: "₹/hr", numeric: true },
        { key: "usd", label: "$/hr", numeric: true },
      ]}
      isEmpty={!gpus?.length}
    >
      {(gpus ?? []).map((g) => (
        <Row key={g.id}>
          <Cell>{g.model}</Cell>
          <Cell muted className="text-xs">
            {g.tier}
          </Cell>
          <Cell numeric>{g.vram_gb} GB</Cell>
          <Cell numeric>{inrPerHour(g.price_inr_per_min_paise)}</Cell>
          <Cell numeric muted>
            {usdPerHour(g.price_inr_per_min_paise)}
          </Cell>
        </Row>
      ))}
    </DataTable>
  );
}

// NOTE (ported as-is): this writes via the browser RLS-scoped client to
// gpu_types directly. The gpu_types RLS policy only allows has_role(admin) —
// finance_admin (which pricing.write is granted to) lacks that legacy role,
// so a finance_admin can open this editor but their save will fail RLS. This
// mismatch existed in the original TanStack app too; fixing it is a schema/
// RLS change out of scope for a like-for-like port.
function CatalogueEditor() {
  const qc = useQueryClient();
  const { data: gpus, isLoading } = useQuery(gpuTypesQuery);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<CatalogueDraft | null>(null);

  const saveMutation = useMutation({
    mutationFn: async (v: { id: string; draft: CatalogueDraft }) => {
      // Keep the USD reference column consistent with the rupee price of record.
      const usdPerHourValue =
        ((v.draft.price_inr_per_min_paise * 60) / 100) * USD_PER_INR;
      const { error } = await supabase
        .from("gpu_types")
        .update({
          model: v.draft.model,
          vram_gb: v.draft.vram_gb,
          tier: v.draft.tier,
          price_inr_per_min_paise: v.draft.price_inr_per_min_paise,
          sort_order: v.draft.sort_order,
          price_usd_per_hour: Number(usdPerHourValue.toFixed(4)),
        })
        .eq("id", v.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["gpu_types"] });
      void qc.invalidateQueries({ queryKey: ["offers"] });
      setEditing(null);
      setDraft(null);
      toast.success("Catalogue updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading)
    return <p className="text-sm text-muted-foreground">Loading catalogue…</p>;

  return (
    <div className="space-y-3">
      {(gpus ?? []).map((g) => {
        const open = editing === g.id;
        return (
          <Card key={g.id} kicker={g.slug} stamp={`${g.vram_gb} GB`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold">{g.model}</h3>
                <p className="num text-xs text-muted-foreground">
                  {inrPerHour(g.price_inr_per_min_paise)}/hr ·{" "}
                  {usdPerHour(g.price_inr_per_min_paise)}/hr · {g.tier}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  if (open) {
                    setEditing(null);
                    setDraft(null);
                    return;
                  }
                  setEditing(g.id);
                  setDraft({
                    model: g.model,
                    vram_gb: g.vram_gb,
                    tier: g.tier,
                    price_inr_per_min_paise: g.price_inr_per_min_paise,
                    sort_order: g.sort_order,
                  });
                }}
              >
                {open ? "Cancel" : "Edit"}
              </Button>
            </div>

            {open && draft && (
              <div className="mt-5 space-y-4 border-t border-hairline pt-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="Model">
                    <Input
                      value={draft.model}
                      maxLength={60}
                      onChange={(e) =>
                        setDraft({ ...draft, model: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="Tier">
                    <Input
                      value={draft.tier}
                      maxLength={20}
                      onChange={(e) =>
                        setDraft({ ...draft, tier: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="VRAM (GB)">
                    <Input
                      type="number"
                      value={draft.vram_gb}
                      onChange={(e) =>
                        setDraft({ ...draft, vram_gb: Number(e.target.value) })
                      }
                    />
                  </Field>
                  <Field label="Paise / minute">
                    <Input
                      type="number"
                      value={draft.price_inr_per_min_paise}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          price_inr_per_min_paise: Number(e.target.value),
                        })
                      }
                    />
                  </Field>
                  <Field label="Sort order">
                    <Input
                      type="number"
                      value={draft.sort_order}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          sort_order: Number(e.target.value),
                        })
                      }
                    />
                  </Field>
                  <Field label="Works out to">
                    <p className="num pt-2 text-sm">
                      {inrPerHour(draft.price_inr_per_min_paise)}/hr ·{" "}
                      {usdPerHour(draft.price_inr_per_min_paise)}/hr
                    </p>
                  </Field>
                </div>
                <Button
                  size="sm"
                  disabled={
                    saveMutation.isPending || draft.price_inr_per_min_paise < 1
                  }
                  onClick={() => saveMutation.mutate({ id: g.id, draft })}
                >
                  Save changes
                </Button>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}
