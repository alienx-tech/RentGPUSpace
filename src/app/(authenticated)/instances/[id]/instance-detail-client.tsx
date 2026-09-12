"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ConsoleShell } from "@/components/ConsoleShell";
import { StatusBadge } from "@/components/StatusBadge";
import { Card } from "@/components/Card";
import { Button } from "@/components/ui/button";
import { instanceEventsQuery, instanceQuery } from "@/lib/queries";
import { inr, inrPerHour, relTime } from "@/lib/format";
import { haltInstance, restartInstance } from "@/lib/rentgpu.functions";

export function InstanceDetailClient({ id }: { id: string }) {
  const qc = useQueryClient();
  const { data: instance } = useQuery(instanceQuery(id));
  const { data: events } = useQuery(instanceEventsQuery(id));

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["instance", id] });
    qc.invalidateQueries({ queryKey: ["instance_events", id] });
    qc.invalidateQueries({ queryKey: ["instances"] });
    qc.invalidateQueries({ queryKey: ["wallet"] });
  };

  const stopM = useMutation({
    mutationFn: (terminate: boolean) =>
      haltInstance({ instanceId: id, terminate }),
    onSuccess: (_d, terminate) => {
      refresh();
      toast.success(terminate ? "Instance terminated" : "Instance stopped");
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Action failed"),
  });

  const startM = useMutation({
    mutationFn: () => restartInstance({ instanceId: id }),
    onSuccess: () => {
      refresh();
      toast.success("Instance starting");
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Could not start instance"),
  });

  if (!instance) {
    return (
      <ConsoleShell title="Instance">
        <p className="text-sm text-muted-foreground">
          Instance not found.{" "}
          <Link href="/instances" className="text-primary hover:underline">
            Back to instances
          </Link>
        </p>
      </ConsoleShell>
    );
  }

  const gpu = instance.provider_offers?.gpu_types;
  const running = instance.status === "running";
  const terminated = instance.status === "terminated";

  return (
    <ConsoleShell
      title={instance.name}
      description={`${gpu?.model} · ${instance.provider_offers?.providers?.company_name}`}
    >
      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge status={instance.status} />
        <span className="num text-sm text-muted-foreground">
          {inrPerHour(instance.price_inr_per_min_paise)}/hr ·{" "}
          {inr(instance.accrued_paise)} spent · {instance.billed_minutes} min
          billed
        </span>
        <div className="ml-auto flex gap-2">
          {running ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => stopM.mutate(false)}
              disabled={stopM.isPending}
            >
              Stop
            </Button>
          ) : (
            !terminated && (
              <Button
                size="sm"
                onClick={() => startM.mutate()}
                disabled={startM.isPending}
              >
                Start
              </Button>
            )
          )}
          {!terminated && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => stopM.mutate(true)}
              disabled={stopM.isPending}
            >
              Terminate
            </Button>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card kicker="Connection">
          <h2 className="text-sm">Connection</h2>
          {running ? (
            <dl className="mt-3 space-y-2 text-sm">
              <Row
                k="SSH"
                v={`ssh -p ${instance.ssh_port} root@${instance.ssh_host}`}
              />
              <Row k="Public IP" v={instance.public_ip || "—"} />
              <Row k="Jupyter token" v={instance.jupyter_token || "—"} />
            </dl>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              Connection details appear while the instance is running.
            </p>
          )}
        </Card>

        <Card kicker="Spec">
          <h2 className="text-sm">Configuration</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <Row k="GPU" v={`${gpu?.model} · ${gpu?.vram_gb} GB VRAM`} />
            <Row k="Compute" v={`${gpu?.vcpus} vCPU · ${gpu?.ram_gb} GB RAM`} />
            <Row k="Storage" v={`${instance.storage_gb} GB NVMe`} />
            <Row k="Template" v={instance.templates?.name ?? "Bare CUDA"} />
            <Row
              k="Region"
              v={instance.provider_offers?.providers?.region ?? "—"}
            />
            <Row
              k="Auto shutdown"
              v={
                instance.auto_shutdown_minutes
                  ? `${instance.auto_shutdown_minutes} min`
                  : "off"
              }
            />
            <Row
              k="Spend cap"
              v={
                instance.spend_cap_paise
                  ? inr(instance.spend_cap_paise)
                  : "none"
              }
            />
          </dl>
        </Card>
      </div>

      <section className="mt-6">
        <h2 className="text-sm text-muted-foreground">Event log</h2>
        <Card padded={false} className="mt-3">
          {(events ?? []).map((e) => (
            <div
              key={e.id}
              className="flex items-center justify-between gap-4 px-4 py-2.5 text-sm"
            >
              <span className="num text-xs text-primary">{e.event}</span>
              <span className="min-w-0 flex-1 truncate text-muted-foreground">
                {e.detail}
              </span>
              <span className="text-xs text-muted-foreground">
                {relTime(e.created_at)}
              </span>
            </div>
          ))}
          {!events?.length && (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              No events yet.
            </p>
          )}
        </Card>
      </section>
    </ConsoleShell>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="num max-w-[65%] truncate text-right">{v}</dd>
    </div>
  );
}
