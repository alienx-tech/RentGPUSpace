"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AdminShell, IfPermitted } from "@/components/admin/AdminShell";
import {
  Cell,
  DataTable,
  Row,
  Stat,
  StatGrid,
  StatusTag,
} from "@/components/admin/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  adminSetOfferActive,
  adminSetOfferPrice,
} from "@/lib/admin-console.functions";
import { adminInventoryQuery } from "@/lib/admin-queries";
import { inrPerHour, pct } from "@/lib/format";

const COLUMNS = [
  { key: "gpu", label: "GPU" },
  { key: "provider", label: "Provider" },
  { key: "region", label: "Region" },
  { key: "vram", label: "VRAM", numeric: true },
  { key: "avail", label: "Avail", numeric: true },
  { key: "total", label: "Total", numeric: true },
  { key: "price", label: "Price/hr", numeric: true },
  { key: "uptime", label: "Uptime", numeric: true },
  { key: "state", label: "State" },
  { key: "actions", label: "" },
];

export function AdminGpusClient() {
  const { data: offers, isLoading } = useQuery(adminInventoryQuery);
  const [model, setModel] = useState("all");
  const [region, setRegion] = useState("all");
  const [onlyDepleted, setOnlyDepleted] = useState(false);
  const [repricing, setRepricing] = useState<string | null>(null);

  const models = useMemo(
    () => ["all", ...new Set((offers ?? []).map((o) => o.gpu))].sort(),
    [offers],
  );
  const regions = useMemo(
    () => ["all", ...new Set((offers ?? []).map((o) => o.region))].sort(),
    [offers],
  );

  const rows = (offers ?? []).filter(
    (o) =>
      (model === "all" || o.gpu === model) &&
      (region === "all" || o.region === region) &&
      (!onlyDepleted || o.available === 0),
  );

  const totals = rows.reduce(
    (acc, o) => ({
      total: acc.total + o.total,
      available: acc.available + o.available,
    }),
    { total: 0, available: 0 },
  );

  return (
    <AdminShell
      title="GPU inventory"
      description="Every offer on the marketplace, live and disabled. Disabling an offer removes it from search immediately; running instances are unaffected."
    >
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading inventory…</p>
      ) : (
        <div className="space-y-4">
          <StatGrid>
            <Stat label="Offers shown" value={rows.length} />
            <Stat label="GPUs" value={totals.total} />
            <Stat label="Available" value={totals.available} />
            <Stat
              label="Utilization"
              value={
                totals.total > 0
                  ? pct(
                      ((totals.total - totals.available) / totals.total) * 100,
                    )
                  : "—"
              }
            />
          </StatGrid>

          <div className="flex flex-wrap items-center gap-2">
            <Select
              label="GPU"
              value={model}
              onChange={setModel}
              options={models}
            />
            <Select
              label="Region"
              value={region}
              onChange={setRegion}
              options={regions}
            />
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={onlyDepleted}
                onChange={(e) => setOnlyDepleted(e.target.checked)}
              />
              Sold out only
            </label>
          </div>

          <DataTable
            columns={COLUMNS}
            isEmpty={!rows.length}
            empty="No offers match these filters."
          >
            {rows.map((o) => (
              <Row key={o.id}>
                <Cell>
                  {o.gpu}
                  <span className="num block text-[11px] text-muted-foreground">
                    {o.tier}
                    {o.isSpot ? " · spot" : ""}
                  </span>
                </Cell>
                <Cell muted className="text-xs">
                  {o.provider}
                </Cell>
                <Cell muted className="text-xs">
                  {o.region} · {o.country}
                </Cell>
                <Cell numeric>{o.vramGb} GB</Cell>
                <Cell numeric>
                  <span
                    className={
                      o.available === 0 ? "text-destructive" : undefined
                    }
                  >
                    {o.available}
                  </span>
                </Cell>
                <Cell numeric>{o.total}</Cell>
                <Cell numeric>{inrPerHour(o.pricePaisePerMin)}</Cell>
                <Cell numeric muted>
                  {o.uptimePct.toFixed(2)}%
                </Cell>
                <Cell>
                  <StatusTag value={o.active ? "active" : "suspended"} />
                </Cell>
                <Cell>
                  <div className="flex justify-end gap-1.5">
                    <IfPermitted permission="pricing.write">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setRepricing(repricing === o.id ? null : o.id)
                        }
                      >
                        Price
                      </Button>
                    </IfPermitted>
                    <IfPermitted permission="gpus.write">
                      <ToggleOffer offerId={o.id} active={o.active} />
                    </IfPermitted>
                  </div>
                </Cell>
              </Row>
            ))}
          </DataTable>

          {repricing && (
            <RepricePanel
              offerId={repricing}
              current={
                rows.find((o) => o.id === repricing)?.pricePaisePerMin ?? 0
              }
              onDone={() => setRepricing(null)}
            />
          )}
        </div>
      )}
    </AdminShell>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="num border border-border bg-surface px-2 py-1 text-xs text-foreground"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

function ToggleOffer({
  offerId,
  active,
}: {
  offerId: string;
  active: boolean;
}) {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => adminSetOfferActive({ offerId, active: !active }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "inventory"] });
      toast.success(active ? "Offer disabled" : "Offer enabled");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={mutation.isPending}
      onClick={() => mutation.mutate()}
    >
      {active ? "Disable" : "Enable"}
    </Button>
  );
}

function RepricePanel({
  offerId,
  current,
  onDone,
}: {
  offerId: string;
  current: number;
  onDone: () => void;
}) {
  const qc = useQueryClient();
  const [paise, setPaise] = useState(String(current));

  const mutation = useMutation({
    mutationFn: (v: number) =>
      adminSetOfferPrice({ offerId, pricePaisePerMin: v }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "inventory"] });
      toast.success("Price updated");
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const next = Number(paise);
  const valid = Number.isInteger(next) && next >= 1;

  return (
    <div className="border border-border bg-surface p-4">
      <p className="num text-[10px] uppercase tracking-wider text-muted-foreground/70">
        Reprice offer
      </p>
      <p className="mt-2 text-xs text-muted-foreground">
        Paise per minute — the rupee price of record. Running instances keep the
        rate they started on; this changes what new deployments pay.
      </p>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <Input
          className="w-40"
          value={paise}
          onChange={(e) => setPaise(e.target.value)}
          inputMode="numeric"
        />
        <p className="num pb-2 text-sm">
          {valid ? `${inrPerHour(next)}/hr` : "—"}
          <span className="ml-2 text-xs text-muted-foreground">
            was {inrPerHour(current)}/hr
          </span>
        </p>
        <Button
          size="sm"
          disabled={!valid || next === current || mutation.isPending}
          onClick={() => mutation.mutate(next)}
        >
          Save price
        </Button>
        <Button size="sm" variant="outline" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
