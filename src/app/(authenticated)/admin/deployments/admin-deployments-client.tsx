"use client";

import { useQuery } from "@tanstack/react-query";

import { AdminShell } from "@/components/admin/AdminShell";
import {
  Cell,
  DataTable,
  Row,
  Stat,
  StatGrid,
  StatusTag,
} from "@/components/admin/primitives";
import { adminInstancesQuery } from "@/lib/admin-queries";
import { relTime } from "@/lib/format";

const COLUMNS = [
  { key: "deployment", label: "Deployment" },
  { key: "user", label: "User" },
  { key: "image", label: "Template" },
  { key: "gpu", label: "GPU" },
  { key: "region", label: "Region" },
  { key: "created", label: "Created", numeric: true },
  { key: "startup", label: "Startup", numeric: true },
  { key: "status", label: "Status" },
];

/**
 * Deployments are instances viewed through their template. Startup time is
 * derived from created_at → started_at, the only timing the schema records.
 */
export function AdminDeploymentsClient() {
  const { data: instances, isLoading } = useQuery(adminInstancesQuery("all"));

  const deployments = (instances ?? []).filter((i) => i.template !== null);
  const failed = (instances ?? []).filter((i) => i.status === "failed");

  const startupSeconds = (created: string, started: string | null) =>
    started
      ? Math.round(
          (new Date(started).getTime() - new Date(created).getTime()) / 1000,
        )
      : null;

  const timings = deployments
    .map((d) => startupSeconds(d.createdAt, d.startedAt))
    .filter((n): n is number => n !== null && n >= 0);
  const medianStartup = timings.length
    ? [...timings].sort((a, b) => a - b)[Math.floor(timings.length / 2)]
    : null;

  return (
    <AdminShell
      title="Deployments"
      description="Template-backed launches, with the time each took to reach running."
    >
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading deployments…</p>
      ) : (
        <div className="space-y-4">
          <StatGrid>
            <Stat label="Template deployments" value={deployments.length} />
            <Stat label="All launches" value={(instances ?? []).length} />
            <Stat
              label="Failed"
              value={failed.length}
              tone={failed.length > 0 ? "bad" : "default"}
            />
            <Stat
              label="Median startup"
              value={medianStartup !== null ? `${medianStartup}s` : "—"}
            />
          </StatGrid>

          <DataTable
            columns={COLUMNS}
            isEmpty={!deployments.length}
            empty="No template-backed deployments yet."
          >
            {deployments.map((d) => {
              const secs = startupSeconds(d.createdAt, d.startedAt);
              return (
                <Row key={d.id}>
                  <Cell>{d.name}</Cell>
                  <Cell muted className="num text-[11px]">
                    {d.userEmail}
                  </Cell>
                  <Cell className="text-xs">{d.template}</Cell>
                  <Cell className="text-xs">{d.gpu}</Cell>
                  <Cell muted className="text-xs">
                    {d.region}
                  </Cell>
                  <Cell numeric muted>
                    {relTime(d.createdAt)}
                  </Cell>
                  <Cell numeric>
                    {secs !== null && secs >= 0 ? `${secs}s` : "—"}
                  </Cell>
                  <Cell>
                    <StatusTag value={d.status} />
                  </Cell>
                </Row>
              );
            })}
          </DataTable>

          <p className="text-xs text-muted-foreground">
            Failure diagnostics show the status only. A cause — image pull,
            capacity, agent timeout — needs a{" "}
            <span className="num">failure_reason</span> on the instance and
            provisioning logs to read from the host.
          </p>
        </div>
      )}
    </AdminShell>
  );
}
