"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { AdminShell, IfPermitted } from "@/components/admin/AdminShell";
import { Cell, DataTable, Row } from "@/components/admin/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminAdjustCredit } from "@/lib/admin-console.functions";
import { adminUsersQuery } from "@/lib/admin-queries";
import { inr, relTime } from "@/lib/format";
import { ROLE_LABELS } from "@/lib/permissions";

const COLUMNS = [
  { key: "user", label: "User" },
  { key: "country", label: "Country" },
  { key: "type", label: "Type" },
  { key: "balance", label: "Balance", numeric: true },
  { key: "spend", label: "Spend", numeric: true },
  { key: "instances", label: "Instances", numeric: true },
  { key: "joined", label: "Joined", numeric: true },
  { key: "actions", label: "" },
];

export function AdminUsersClient() {
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");
  const { data: users, isLoading } = useQuery(adminUsersQuery(term));
  const [crediting, setCrediting] = useState<string | null>(null);

  return (
    <AdminShell
      title="Users"
      description="Every account on the platform, with wallet balance and lifetime spend."
      actions={
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setTerm(search);
          }}
        >
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name or organisation…"
            className="h-8 w-56 text-sm"
            maxLength={120}
          />
          <Button size="sm" type="submit" variant="outline">
            Search
          </Button>
        </form>
      }
    >
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading users…</p>
      ) : (
        <DataTable
          columns={COLUMNS}
          isEmpty={!users?.length}
          empty={term ? `No users match “${term}”.` : "No users yet."}
        >
          {(users ?? []).map((u) => (
            <Row key={u.id}>
              <Cell>
                <span className="block truncate">{u.displayName || "—"}</span>
                <span className="num block truncate text-[11px] text-muted-foreground">
                  {u.email}
                  {u.orgName ? ` · ${u.orgName}` : ""}
                </span>
              </Cell>
              <Cell muted>{u.country}</Cell>
              <Cell muted className="text-xs">
                {u.roles.map((r) => ROLE_LABELS[r] ?? r).join(", ")}
              </Cell>
              <Cell numeric>{inr(u.balancePaise)}</Cell>
              <Cell numeric>{inr(u.spendPaise)}</Cell>
              <Cell numeric>{u.instances}</Cell>
              <Cell numeric muted>
                {relTime(u.joinedAt)}
              </Cell>
              <Cell>
                <IfPermitted permission="users.credit">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setCrediting(crediting === u.id ? null : u.id)
                    }
                  >
                    {crediting === u.id ? "Cancel" : "Credit"}
                  </Button>
                </IfPermitted>
              </Cell>
            </Row>
          ))}
        </DataTable>
      )}

      {crediting && (
        <CreditPanel userId={crediting} onDone={() => setCrediting(null)} />
      )}
    </AdminShell>
  );
}

/**
 * Moving credit needs a reason: it is written to the wallet's own transaction
 * history and to the audit log, so an unexplained balance change never happens.
 */
function CreditPanel({
  userId,
  onDone,
}: {
  userId: string;
  onDone: () => void;
}) {
  const qc = useQueryClient();
  const [rupees, setRupees] = useState("");
  const [reason, setReason] = useState("");

  const mutation = useMutation({
    mutationFn: (v: { userId: string; amountPaise: number; reason: string }) =>
      adminAdjustCredit(v),
    onSuccess: (result) => {
      void qc.invalidateQueries({ queryKey: ["admin", "users"] });
      toast.success(`Wallet is now ${inr(result.balancePaise)}`);
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const amountPaise = Math.round(Number(rupees || 0) * 100);
  const valid =
    Number.isFinite(amountPaise) &&
    amountPaise !== 0 &&
    reason.trim().length >= 3;

  return (
    <div className="mt-4 border border-border bg-surface p-4">
      <p className="num text-[10px] uppercase tracking-wider text-muted-foreground/70">
        Wallet adjustment
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <div>
          <Label className="text-xs">Amount (₹, negative removes)</Label>
          <Input
            className="mt-1.5"
            value={rupees}
            onChange={(e) => setRupees(e.target.value)}
            placeholder="500 or -500"
            inputMode="decimal"
          />
        </div>
        <div className="sm:col-span-2">
          <Label className="text-xs">Reason (recorded in the audit log)</Label>
          <Input
            className="mt-1.5"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Goodwill credit for ticket #482"
            maxLength={500}
          />
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <Button
          size="sm"
          disabled={!valid || mutation.isPending}
          onClick={() =>
            mutation.mutate({ userId, amountPaise, reason: reason.trim() })
          }
        >
          {amountPaise >= 0 ? "Add credit" : "Remove credit"}
        </Button>
        <Button size="sm" variant="outline" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
