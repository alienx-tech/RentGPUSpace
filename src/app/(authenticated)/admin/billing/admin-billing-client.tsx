"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { AdminShell } from "@/components/admin/AdminShell";
import {
  Cell,
  DataTable,
  RangeFilter,
  Row,
  Stat,
  StatGrid,
  StatusTag,
  type Range,
} from "@/components/admin/primitives";
import { adminBillingQuery } from "@/lib/admin-queries";
import { inr } from "@/lib/format";

const COLUMNS = [
  { key: "invoice", label: "Invoice" },
  { key: "user", label: "Customer" },
  { key: "period", label: "Period" },
  { key: "compute", label: "Compute", numeric: true },
  { key: "storage", label: "Storage", numeric: true },
  { key: "tax", label: "Tax", numeric: true },
  { key: "total", label: "Total", numeric: true },
  { key: "status", label: "Status" },
];

export function AdminBillingClient() {
  const [range, setRange] = useState<Range>("30d");
  const { data, isLoading } = useQuery(adminBillingQuery(range));

  return (
    <AdminShell
      title="Billing"
      description="Customer charges and the split between platform commission and provider payable."
      actions={<RangeFilter value={range} onChange={setRange} />}
    >
      {isLoading || !data ? (
        <p className="text-sm text-muted-foreground">Loading billing…</p>
      ) : (
        <div className="space-y-4">
          <StatGrid>
            <Stat
              label={`Gross revenue (${range})`}
              value={inr(data.grossPaise)}
            />
            <Stat
              label="Platform commission"
              value={inr(data.commissionPaise)}
            />
            <Stat label="Payable to providers" value={inr(data.payablePaise)} />
            <Stat
              label="Outstanding invoices"
              value={data.outstandingInvoices}
              tone={data.outstandingInvoices > 0 ? "warn" : "default"}
            />
          </StatGrid>

          <StatGrid>
            <Stat label="Credits issued" value={inr(data.creditsIssuedPaise)} />
            <Stat label="Invoices in range" value={data.invoices.length} />
          </StatGrid>

          <DataTable
            columns={COLUMNS}
            isEmpty={!data.invoices.length}
            empty="No invoices in this period."
          >
            {data.invoices.map((i) => (
              <Row key={i.id}>
                <Cell muted className="num text-[11px]">
                  {i.id.slice(0, 8)}
                </Cell>
                <Cell muted className="num text-[11px]">
                  {i.userEmail}
                </Cell>
                <Cell muted className="text-xs">
                  {i.periodStart}
                </Cell>
                <Cell numeric>{inr(i.computePaise)}</Cell>
                <Cell numeric>{inr(i.storagePaise)}</Cell>
                <Cell numeric>{inr(i.taxPaise)}</Cell>
                <Cell numeric>{inr(i.totalPaise)}</Cell>
                <Cell>
                  <StatusTag value={i.status} />
                </Cell>
              </Row>
            ))}
          </DataTable>

          <p className="text-xs text-muted-foreground">
            Amounts are the base-currency record. Per-currency invoicing and
            multi-jurisdiction tax lines have schema support (currencies,
            fx_rates, tax_rules, invoice_tax_lines) but no invoices written
            against them yet.
          </p>
        </div>
      )}
    </AdminShell>
  );
}
