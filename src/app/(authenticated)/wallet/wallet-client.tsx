"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, FileText, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { ConsoleShell } from "@/components/ConsoleShell";
import { Card } from "@/components/Card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { invoicesQuery, transactionsQuery, walletQuery } from "@/lib/queries";
import { GST_RATE, inr, relTime } from "@/lib/format";
import { addCredit, refreshInvoices } from "@/lib/rentgpu.functions";
import {
  downloadInvoiceCsv,
  invoiceLines,
  printInvoicePdf,
  type InvoiceRecord,
} from "@/lib/invoice-export";
import { useAuth } from "@/hooks/useAuth";

const PRESETS = [50000, 200000, 500000, 2000000];

type MethodId =
  | "upi_intent"
  | "upi_id"
  | "upi_qr"
  | "netbanking"
  | "wallet"
  | "rtgs"
  | "card";

type MethodOption = { id: MethodId; label: string; placeholder: string };

const METHOD_GROUPS: {
  label: string;
  hint: string;
  options: MethodOption[];
}[] = [
  {
    label: "UPI",
    hint: "Instant, zero fee. Works with any UPI app.",
    options: [
      {
        id: "upi_intent",
        label: "UPI app (GPay / PhonePe / Paytm)",
        placeholder: "",
      },
      { id: "upi_id", label: "UPI ID", placeholder: "yourname@okhdfcbank" },
      { id: "upi_qr", label: "UPI QR", placeholder: "" },
    ],
  },
  {
    label: "Bank & wallets",
    hint: "Cleared within minutes; NEFT/RTGS same working day.",
    options: [
      {
        id: "netbanking",
        label: "Net banking",
        placeholder: "HDFC / ICICI / SBI…",
      },
      {
        id: "wallet",
        label: "Prepaid wallet",
        placeholder: "Paytm / Amazon Pay",
      },
      { id: "rtgs", label: "NEFT / RTGS", placeholder: "UTR reference" },
      { id: "card", label: "Card", placeholder: "" },
    ],
  },
];

export function WalletClient() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: wallet } = useQuery(walletQuery);
  const { data: txns } = useQuery(transactionsQuery);
  const { data: invoices } = useQuery(invoicesQuery);

  const [amount, setAmount] = useState(200000);
  const [method, setMethod] = useState<MethodId>("upi_intent");
  const [detail, setDetail] = useState("");

  const active = METHOD_GROUPS.flatMap((g) => g.options).find(
    (o) => o.id === method,
  )!;

  const mutation = useMutation({
    mutationFn: () =>
      addCredit({ amountPaise: amount, method, detail: detail.trim() }),
    onSuccess: (res) => {
      void qc.invalidateQueries({ queryKey: ["wallet"] });
      void qc.invalidateQueries({ queryKey: ["wallet_transactions"] });
      setDetail("");
      toast.success(`${inr(amount)} added · ref ${res.reference}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const invoiceMutation = useMutation({
    mutationFn: () => refreshInvoices(),
    onSuccess: (res) => {
      void qc.invalidateQueries({ queryKey: ["invoices"] });
      toast.success(
        res.invoices
          ? `${res.invoices} invoice(s) generated`
          : "Invoices are already up to date",
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <ConsoleShell
      title="Wallet & invoices"
      description="Prepaid balance in rupees, UPI and bank top-ups, and GST-ready monthly invoices built from per-minute metering."
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <Card kicker="Balance">
          <p className="text-xs text-muted-foreground">Available balance</p>
          <p className="num mt-2 text-4xl font-bold text-primary">
            {wallet ? inr(wallet.balance_paise) : "—"}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Low-balance alert at{" "}
            {wallet ? inr(wallet.low_balance_threshold_paise) : "—"}
          </p>

          <div className="mt-6 space-y-5">
            <div>
              <Label className="text-xs">Top-up amount</Label>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {PRESETS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setAmount(p)}
                    className={`num border px-2.5 py-1 text-xs transition-colors ${
                      amount === p
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    {inr(p, { decimals: 0 })}
                  </button>
                ))}
              </div>
              <Input
                className="mt-3"
                type="number"
                min={100}
                value={amount / 100}
                onChange={(e) =>
                  setAmount(Math.round(Number(e.target.value) * 100))
                }
              />
            </div>

            {METHOD_GROUPS.map((group) => (
              <div key={group.label}>
                <Label className="text-xs">{group.label}</Label>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {group.options.map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => {
                        setMethod(o.id);
                        setDetail("");
                      }}
                      className={`rounded-md border px-3 py-1.5 text-xs transition-colors ${
                        method === o.id
                          ? "border-primary bg-primary/15 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  {group.hint}
                </p>
              </div>
            ))}

            {active.placeholder ? (
              <div>
                <Label className="text-xs">Payment detail</Label>
                <Input
                  className="mt-2"
                  value={detail}
                  maxLength={80}
                  placeholder={active.placeholder}
                  onChange={(e) => setDetail(e.target.value)}
                />
              </div>
            ) : null}

            {method === "upi_qr" && (
              <div className="border border-dashed border-border p-4 text-center">
                <div className="mx-auto grid h-28 w-28 place-items-center rounded bg-primary/10 text-[10px] text-primary">
                  UPI QR
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Scan with any UPI app, then confirm below to credit your
                  wallet.
                </p>
              </div>
            )}

            <Button
              className="w-full"
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending}
            >
              {mutation.isPending
                ? "Processing…"
                : `Add ${inr(amount, { decimals: 0 })}`}
            </Button>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Sandbox payments for the MVP — no real money moves. GST at{" "}
              {Math.round(GST_RATE * 100)}% is applied on monthly invoices, not
              on wallet top-ups.
            </p>
          </div>
        </Card>

        <div className="space-y-6">
          <section>
            <div className="flex items-center justify-between">
              <h2 className="text-sm text-muted-foreground">Invoices</h2>
              <Button
                size="sm"
                variant="outline"
                disabled={invoiceMutation.isPending}
                onClick={() => invoiceMutation.mutate()}
              >
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                {invoiceMutation.isPending ? "Building…" : "Generate"}
              </Button>
            </div>
            <Card padded={false} className="mt-3">
              {((invoices ?? []) as InvoiceRecord[]).map((inv) => (
                <div
                  key={inv.invoice_number ?? inv.period_start}
                  className="px-4 py-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="num text-sm">
                        {inv.invoice_number ?? "Draft"}
                      </p>
                      <p className="num text-xs text-muted-foreground">
                        {inv.period_start} → {inv.period_end} ·{" "}
                        {invoiceLines(inv).length} line items ·{" "}
                        {inv.compute_minutes} min
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{inv.status}</Badge>
                      <span className="num text-sm">
                        {inr(inv.total_paise)}
                      </span>
                    </div>
                  </div>
                  <div className="num mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                    <span>Compute {inr(inv.compute_paise)}</span>
                    <span>Storage {inr(inv.storage_paise)}</span>
                    <span>
                      GST {Math.round(inv.gst_rate * 100)}% {inr(inv.gst_paise)}
                    </span>
                    <span>GSTIN {inv.gst_number ?? "not provided"}</span>
                  </div>
                  <div className="mt-2.5 flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (!printInvoicePdf(inv, user?.email ?? "Customer")) {
                          toast.error("Allow pop-ups to download the PDF");
                        }
                      }}
                    >
                      <FileText className="mr-1.5 h-3.5 w-3.5" /> PDF
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => downloadInvoiceCsv(inv)}
                    >
                      <Download className="mr-1.5 h-3.5 w-3.5" /> CSV
                    </Button>
                  </div>
                </div>
              ))}
              {!invoices?.length && (
                <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No invoices yet. Hit Generate to close out completed months
                  from your metered usage.
                </p>
              )}
            </Card>
          </section>

          <section>
            <h2 className="text-sm text-muted-foreground">Transactions</h2>
            <Card padded={false} className="mt-3 max-h-[420px] overflow-y-auto">
              {(txns ?? []).map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between px-4 py-3 text-sm"
                >
                  <div>
                    <p>{t.description || t.kind}</p>
                    <p className="text-xs text-muted-foreground">
                      {relTime(t.created_at)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`num ${t.kind === "credit" ? "text-primary" : "text-foreground"}`}
                    >
                      {t.kind === "credit" ? "+" : "−"}
                      {inr(Math.abs(t.amount_paise))}
                    </p>
                    <p className="num text-[11px] text-muted-foreground">
                      bal {inr(t.balance_after_paise)}
                    </p>
                  </div>
                </div>
              ))}
              {!txns?.length && (
                <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No transactions yet.
                </p>
              )}
            </Card>
          </section>
        </div>
      </div>
    </ConsoleShell>
  );
}
