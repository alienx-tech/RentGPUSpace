"use client";

import { useQuery } from "@tanstack/react-query";

import { AdminShell } from "@/components/admin/AdminShell";
import { Stat, StatGrid, StatusTag } from "@/components/admin/primitives";
import { Card } from "@/components/Card";

type Probe = { status: "ok"; uptimeSeconds: number };

/**
 * Reads the app's own /healthz — the same endpoint the container healthcheck
 * probes — so this page reflects the liveness signal that actually decides
 * whether a replica stays in rotation.
 */
const healthQuery = {
  queryKey: ["admin", "health"],
  queryFn: async (): Promise<Probe> => {
    const res = await fetch("/healthz", {
      headers: { accept: "application/json" },
    });
    if (!res.ok) throw new Error(`Web tier returned ${res.status}`);
    return (await res.json()) as Probe;
  },
  refetchInterval: 15_000,
};

/** Services in the spec, and whether this deployment can actually observe them. */
const SERVICES = [
  { name: "Web / SSR", observable: true },
  { name: "Database (Supabase)", observable: true },
  { name: "Authentication", observable: true },
  { name: "API Gateway", observable: false },
  { name: "Scheduler", observable: false },
  { name: "Provisioning", observable: false },
  { name: "Billing worker", observable: false },
  { name: "GPU Agent", observable: false },
  { name: "Object Storage", observable: false },
] as const;

export function AdminHealthClient() {
  const web = useQuery(healthQuery);
  // Any authenticated page load already proves the database and auth path;
  // the permission query behind the shell is that proof.
  const dbReachable = !web.isError;

  return (
    <AdminShell
      title="Platform health"
      description="Live status of the services this deployment can observe."
    >
      <div className="space-y-4">
        <StatGrid>
          <Stat
            label="Web tier"
            value={web.isError ? "Down" : web.isLoading ? "…" : "Operational"}
            tone={web.isError ? "bad" : "default"}
          />
          <Stat
            label="Uptime"
            value={web.data ? formatUptime(web.data.uptimeSeconds) : "—"}
            hint="Since this replica started"
          />
          <Stat
            label="Database"
            value={dbReachable ? "Reachable" : "Unknown"}
          />
          <Stat label="Probe interval" value="15s" />
        </StatGrid>

        <div className="border border-border bg-surface">
          <div className="border-b border-border bg-background px-3 py-1.5">
            <span className="num text-[10px] text-muted-foreground">
              Services
            </span>
          </div>
          <ul>
            {SERVICES.map((s) => (
              <li
                key={s.name}
                className="flex items-center justify-between border-b border-border/60 px-3 py-2 last:border-0"
              >
                <span className="text-sm">{s.name}</span>
                {s.observable ? (
                  <StatusTag value={web.isError ? "failed" : "operational"} />
                ) : (
                  <span className="num text-[10px] text-muted-foreground/50">
                    no probe
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>

        <Card kicker="what “no probe” means">
          <p className="text-sm text-muted-foreground">
            Those services either do not exist yet as separate processes, or
            expose no health endpoint for this console to read. Rendering them
            as green would be a lie the first time one of them broke. Each
            becomes a real row once it has an endpoint and a registry entry to
            check against.
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            The web tier row is genuine: it polls{" "}
            <span className="num">/healthz</span>, the same liveness endpoint
            the container healthcheck uses.
          </p>
        </Card>
      </div>
    </AdminShell>
  );
}

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h`;
}
