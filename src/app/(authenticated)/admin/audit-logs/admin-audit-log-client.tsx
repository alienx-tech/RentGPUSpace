"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { AdminShell } from "@/components/admin/AdminShell";
import { Cell, DataTable, Row } from "@/components/admin/primitives";
import { Input } from "@/components/ui/input";
import { adminAuditQuery } from "@/lib/admin-queries";
import { relTime } from "@/lib/format";

const COLUMNS = [
  { key: "when", label: "When" },
  { key: "admin", label: "Admin" },
  { key: "action", label: "Action" },
  { key: "resource", label: "Resource" },
  { key: "change", label: "Change" },
  { key: "ip", label: "IP" },
];

export function AdminAuditLogClient() {
  const { data: entries, isLoading, error } = useQuery(adminAuditQuery);
  const [filter, setFilter] = useState("");

  const rows = (entries ?? []).filter((e) =>
    filter
      ? `${e.actorEmail} ${e.action} ${e.resourceType} ${e.resourceId ?? ""}`
          .toLowerCase()
          .includes(filter.toLowerCase())
      : true,
  );

  return (
    <AdminShell
      title="Audit logs"
      description="Every privileged action, append-only. Nobody can edit or delete these rows — the table grants staff SELECT and nothing else."
      actions={
        <Input
          className="h-8 w-56 text-sm"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by admin, action, resource…"
        />
      }
    >
      {error ? (
        <p className="text-sm text-destructive">{(error as Error).message}</p>
      ) : isLoading ? (
        <p className="text-sm text-muted-foreground">Loading audit trail…</p>
      ) : (
        <DataTable
          columns={COLUMNS}
          isEmpty={!rows.length}
          empty={
            filter
              ? "No entries match that filter."
              : "No privileged actions recorded yet. Entries appear here the moment an admin repricing, credit adjustment or force-termination happens."
          }
        >
          {rows.map((e) => (
            <Row key={e.id}>
              <Cell muted className="num whitespace-nowrap text-[11px]">
                {relTime(e.createdAt)}
              </Cell>
              <Cell className="num text-[11px]">{e.actorEmail || "—"}</Cell>
              <Cell className="num text-xs">{e.action}</Cell>
              <Cell muted className="num text-[11px]">
                {e.resourceType}
                {e.resourceId ? ` · ${e.resourceId.slice(0, 8)}` : ""}
              </Cell>
              <Cell className="num text-[11px]">
                <Diff previous={e.previous} next={e.next} />
              </Cell>
              <Cell muted className="num text-[11px]">
                {e.ip ?? "—"}
              </Cell>
            </Row>
          ))}
        </DataTable>
      )}
    </AdminShell>
  );
}

/** Shows only the fields that actually changed, old → new. */
function Diff({ previous, next }: { previous: unknown; next: unknown }) {
  const before = asRecord(previous);
  const after = asRecord(next);
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])];

  if (!keys.length) return <span className="text-muted-foreground">—</span>;

  return (
    <span className="space-y-0.5">
      {keys.map((k) => (
        <span key={k} className="block">
          <span className="text-muted-foreground">{k}: </span>
          <span className="text-muted-foreground line-through">
            {render(before[k])}
          </span>
          <span className="text-muted-foreground"> → </span>
          <span className="text-foreground">{render(after[k])}</span>
        </span>
      ))}
    </span>
  );
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function render(value: unknown): string {
  if (value === undefined || value === null) return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
