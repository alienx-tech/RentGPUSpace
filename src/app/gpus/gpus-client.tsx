"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Card } from "@/components/Card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { gpuTypesQuery, offersQuery, templatesQuery } from "@/lib/queries";
import { inr, inrPerHour } from "@/lib/format";
import { useAuth } from "@/hooks/useAuth";
import { deployInstance } from "@/lib/rentgpu.functions";

export function GpusClient() {
  const { data: offers } = useQuery(offersQuery);
  const { data: gpus } = useQuery(gpuTypesQuery);
  const { data: templates } = useQuery(templatesQuery);
  const { session } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();

  const [gpuFilter, setGpuFilter] = useState<string>("all");
  const [regionFilter, setRegionFilter] = useState<string>("all");
  const [selected, setSelected] = useState<string | null>(null);

  const [name, setName] = useState("training-run-01");
  const [templateId, setTemplateId] = useState<string>("");
  const [storageGb, setStorageGb] = useState(100);

  const regions = useMemo(
    () =>
      Array.from(
        new Set((offers ?? []).map((o) => o.providers?.region).filter(Boolean)),
      ) as string[],
    [offers],
  );

  const filtered = (offers ?? []).filter(
    (o) =>
      (gpuFilter === "all" || o.gpu_type_id === gpuFilter) &&
      (regionFilter === "all" || o.providers?.region === regionFilter),
  );

  const activeOffer = filtered.find((o) => o.id === selected) ?? null;

  // The GPU list shows every model. Ones no provider currently offers are
  // still shown, marked unavailable, so the range is legible even when supply is thin.
  const offeredGpuIds = new Set((offers ?? []).map((o) => o.gpu_type_id));
  const unlisted = (gpus ?? []).filter(
    (g) =>
      !offeredGpuIds.has(g.id) && (gpuFilter === "all" || gpuFilter === g.id),
  );

  const mutation = useMutation({
    mutationFn: async () => {
      if (!activeOffer) throw new Error("No offer selected");
      return deployInstance({
        offerId: activeOffer.id,
        templateId: templateId || null,
        name,
        storageGb,
      });
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["instances"] });
      qc.invalidateQueries({ queryKey: ["wallet"] });
      setSelected(null);
      toast.success("Instance deploying");
      router.push(`/instances/${res.id}`);
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Deployment failed"),
  });

  function onRent(offerId: string) {
    if (!session) {
      router.push("/auth?mode=signup&redirect=%2Fgpus");
      return;
    }
    setSelected(offerId);
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-7xl px-5 py-12">
        <h1 className="text-2xl md:text-3xl">GPU’S</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Live inventory. Billed per minute to your wallet.
        </p>

        <div className="mt-8 flex flex-wrap gap-8 border-b border-border pb-6">
          <div>
            <p className="text-xs text-muted-foreground">Model</p>
            <div className="mt-2 flex flex-wrap gap-1">
              <FilterChip
                active={gpuFilter === "all"}
                onClick={() => setGpuFilter("all")}
              >
                All
              </FilterChip>
              {(gpus ?? []).map((g) => (
                <FilterChip
                  key={g.id}
                  active={gpuFilter === g.id}
                  onClick={() => setGpuFilter(g.id)}
                >
                  {g.model}
                </FilterChip>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Region</p>
            <div className="mt-2 flex flex-wrap gap-1">
              <FilterChip
                active={regionFilter === "all"}
                onClick={() => setRegionFilter("all")}
              >
                All
              </FilterChip>
              {regions.map((r) => (
                <FilterChip
                  key={r}
                  active={regionFilter === r}
                  onClick={() => setRegionFilter(r)}
                >
                  {r}
                </FilterChip>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 stagger grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((o) => (
            <Card
              key={o.id}
              kicker={o.providers?.region}
              stamp={
                o.available_units > 0 ? (
                  `${o.available_units} free`
                ) : (
                  <span className="text-destructive">sold out</span>
                )
              }
              footer={
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p
                      className={`num text-base ${o.available_units > 0 ? "" : "text-muted-foreground"}`}
                    >
                      {inrPerHour(o.price_inr_per_min_paise)}/hr
                    </p>
                    <p className="num text-[11px] text-muted-foreground">
                      {inr(o.price_inr_per_min_paise)}/min
                    </p>
                  </div>
                  <Button
                    size="sm"
                    disabled={o.available_units < 1}
                    onClick={() => onRent(o.id)}
                  >
                    Rent
                  </Button>
                </div>
              }
            >
              <h2 className="text-base">{o.gpu_types?.model}</h2>
              <p className="num mt-1 text-xs text-muted-foreground">
                {o.gpu_types?.vram_gb} GB VRAM · {o.gpu_types?.vcpus} vCPU ·{" "}
                {o.gpu_types?.ram_gb} GB RAM
              </p>
              <p className="mt-4 text-sm text-muted-foreground">
                {o.providers?.company_name}
              </p>
              <p className="num mt-1 text-xs text-muted-foreground">
                {o.total_units}× unit · {o.storage_gb_included} GB NVMe
              </p>
            </Card>
          ))}

          {unlisted.map((g) => (
            <Card
              key={g.id}
              className="border-dashed"
              kicker="not listed"
              stamp={<span className="text-muted-foreground">unavailable</span>}
              footer={
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="num text-base text-muted-foreground">
                      {inrPerHour(g.price_inr_per_min_paise)}/hr
                    </p>
                    <p className="num text-[11px] text-muted-foreground">
                      list price
                    </p>
                  </div>
                  <Button asChild size="sm" variant="outline">
                    <Link href="/support">Request capacity</Link>
                  </Button>
                </div>
              }
            >
              <h2 className="text-base text-muted-foreground">{g.model}</h2>
              <p className="num mt-1 text-xs text-muted-foreground">
                {g.vram_gb} GB VRAM · {g.vcpus} vCPU · {g.ram_gb} GB RAM
              </p>
              <p className="mt-4 text-sm text-muted-foreground">
                No provider capacity right now.
              </p>
            </Card>
          ))}
        </div>

        {filtered.length === 0 && unlisted.length === 0 && (
          <p className="mt-12 text-center text-sm text-muted-foreground">
            No offers match those filters.{" "}
            <Link href="/support" className="text-primary hover:underline">
              Request capacity
            </Link>
          </p>
        )}
      </main>

      <Dialog
        open={!!activeOffer}
        onOpenChange={(open) => !open && setSelected(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deploy {activeOffer?.gpu_types?.model}</DialogTitle>
            <DialogDescription>
              {activeOffer
                ? inrPerHour(activeOffer.price_inr_per_min_paise)
                : ""}{" "}
              per hour, billed every minute from your wallet.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="iname">Instance name</Label>
              <Input
                id="iname"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Environment</Label>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {(templates ?? []).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTemplateId(t.id)}
                    className={`flex items-center justify-between border px-3 py-2 text-left text-xs ${
                      templateId === t.id
                        ? "border-foreground text-foreground"
                        : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t.name}
                    {templateId === t.id && (
                      <Check className="h-3.5 w-3.5 text-primary" />
                    )}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="storage">Storage (GB)</Label>
              <Input
                id="storage"
                type="number"
                min={20}
                max={2000}
                value={storageGb}
                onChange={(e) => setStorageGb(Number(e.target.value))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setSelected(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "Deploying…" : "Deploy instance"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SiteFooter />
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border px-2.5 py-1 text-xs transition-[color,border-color,transform] duration-200 active:scale-[0.97] ${
        active
          ? "border-foreground text-foreground"
          : "border-border text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
