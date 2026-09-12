"use client";

import Link from "next/link";
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
  StatusTag,
} from "@/components/admin/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminTerminateInstance } from "@/lib/admin-console.functions";
import { adminInstancesQuery } from "@/lib/admin-queries";
import { inr, inrPerHour, relTime } from "@/lib/format";

const STATUSES = [
  "all",
  "provisioning",
  "running",
  "stopping",
  "stopped",
  "failed",
  "terminated",
] as const;

const COLUMNS = [
  { key: "instance", label: "Instance" },
  { key: "user", label: "User" },
  { key: "gpu", label: "GPU" },
  { key: "region", label: "Region" },
  { key: "rate", label: "Rate", numeric: true },
  { key: "accrued", label: "Cost", numeric: true },
  { key: "runtime", label: "Started", numeric: true },
  { key: "status", label: "Status" },
  { key: "actions", label: "" },
];

export function AdminInstancesClient() {
  const [status, setStatus] = useState<string>("all");
  const { data: instances, isLoading } = useQuery(adminInstancesQuery(status));
  const [terminating, setTerminating] = useState<string | null>(null);

  const live = (instances ?? []).filter(
    (i) => i.status === "running" || i.status === "provisioning",
  );
  const burn = live.reduce((n, i) => n + i.pricePaisePerMin, 0);

  return (
    <AdminShell
      title="Instances"
      description="Every deployment across all tenants. Force termination bills the customer for elapsed time and returns the provider's unit, exactly as a normal stop does."
      actions={
        <div className="flex flex-wrap gap-1">
          {STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className={
                "num border px-2 py-1 text-[11px] capitalize transition-colors " +
                (status === s
                  ? "border-border bg-surface text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground")
              }
            >
              {s}
            </button>
          ))}
        </div>
      }
    >
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading instances…</p>
      ) : (
        <div className="space-y-4">
          <StatGrid>
            <Stat label="Live now" value={live.length} />
            <Stat label="Shown" value={(instances ?? []).length} />
            <Stat label="Current burn" value={`${inrPerHour(burn)}/hr`} />
            <Stat
              label="Failed"
              value={
                (instances ?? []).filter((i) => i.status === "failed").length
              }
              tone={
                (instances ?? []).some((i) => i.status === "failed")
                  ? "bad"
                  : "default"
              }
            />
          </StatGrid>

          <DataTable
            columns={COLUMNS}
            isEmpty={!instances?.length}
            empty="No instances match."
          >
            {(instances ?? []).map((i) => (
              <Row key={i.id}>
                <Cell>
                  <Link
                    href={`/instances/${i.id}`}
                    className="underline-offset-4 hover:underline"
                  >
                    {i.name}
                  </Link>
                  {i.template && (
                    <span className="num block text-[11px] text-muted-foreground">
                      {i.template}
                    </span>
                  )}
                </Cell>
                <Cell muted className="num text-[11px]">
                  {i.userEmail}
                </Cell>
                <Cell className="text-xs">{i.gpu}</Cell>
                <Cell muted className="text-xs">
                  {i.region}
                </Cell>
                <Cell numeric>{inrPerHour(i.pricePaisePerMin)}</Cell>
                <Cell numeric>{inr(i.accruedPaise)}</Cell>
                <Cell numeric muted>
                  {relTime(i.startedAt)}
                </Cell>
                <Cell>
                  <StatusTag value={i.status} />
                </Cell>
                <Cell>
                  {i.status !== "terminated" && (
                    <IfPermitted permission="instances.write">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setTerminating(terminating === i.id ? null : i.id)
                        }
                      >
                        Terminate
                      </Button>
                    </IfPermitted>
                  )}
                </Cell>
              </Row>
            ))}
          </DataTable>

          {terminating && (
            <TerminatePanel
              instanceId={terminating}
              name={
                (instances ?? []).find((i) => i.id === terminating)?.name ?? ""
              }
              onDone={() => setTerminating(null)}
            />
          )}
        </div>
      )}
    </AdminShell>
  );
}

function TerminatePanel({
  instanceId,
  name,
  onDone,
}: {
  instanceId: string;
  name: string;
  onDone: () => void;
}) {
  const qc = useQueryClient();
  const [reason, setReason] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      adminTerminateInstance({ instanceId, reason: reason.trim() }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "instances"] });
      toast.success("Instance terminated");
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="border border-destructive/40 bg-surface p-4">
      <p className="num text-[10px] uppercase tracking-wider text-destructive">
        Force terminate
      </p>
      <p className="mt-2 text-sm">
        This ends <span className="num">{name}</span> for its owner. The
        customer is billed for time already used and the GPU returns to the
        pool. It cannot be undone.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Input
          className="w-full sm:w-96"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason — recorded in the audit log"
          maxLength={500}
        />
        <Button
          size="sm"
          variant="destructive"
          disabled={reason.trim().length < 3 || mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          Terminate
        </Button>
        <Button size="sm" variant="outline" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
