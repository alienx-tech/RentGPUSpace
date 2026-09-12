import { inr } from "./format";

export type InvoiceLine = {
  description: string;
  minutes: number;
  amount_paise: number;
};

export type InvoiceRecord = {
  invoice_number: string | null;
  period_start: string;
  period_end: string;
  compute_paise: number;
  storage_paise: number;
  gst_paise: number;
  total_paise: number;
  gst_rate: number;
  gst_number: string | null;
  place_of_supply: string;
  compute_minutes: number;
  line_items: unknown;
  status: string;
};

export function invoiceLines(invoice: InvoiceRecord): InvoiceLine[] {
  const raw = invoice.line_items;
  if (!Array.isArray(raw)) return [];
  return raw as InvoiceLine[];
}

function download(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadInvoiceCsv(invoice: InvoiceRecord) {
  const rows: string[][] = [
    ["Invoice number", invoice.invoice_number ?? ""],
    ["Period", `${invoice.period_start} to ${invoice.period_end}`],
    ["GSTIN", invoice.gst_number ?? "Not provided"],
    ["Place of supply", invoice.place_of_supply],
    [],
    ["Description", "Billed minutes", "Amount (INR)"],
    ...invoiceLines(invoice).map((l) => [
      l.description,
      String(l.minutes),
      (l.amount_paise / 100).toFixed(2),
    ]),
    [],
    [
      "Compute subtotal",
      String(invoice.compute_minutes),
      (invoice.compute_paise / 100).toFixed(2),
    ],
    ["Storage subtotal", "", (invoice.storage_paise / 100).toFixed(2)],
    [
      `GST @ ${Math.round(invoice.gst_rate * 100)}%`,
      "",
      (invoice.gst_paise / 100).toFixed(2),
    ],
    ["Total payable", "", (invoice.total_paise / 100).toFixed(2)],
  ];
  const csv = rows
    .map((r) =>
      r.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","),
    )
    .join("\n");
  download(
    `${invoice.invoice_number ?? "invoice"}.csv`,
    csv,
    "text/csv;charset=utf-8",
  );
}

/** Opens a print-ready invoice; the browser's print dialog saves it as a PDF. */
export function printInvoicePdf(invoice: InvoiceRecord, org: string) {
  const lines = invoiceLines(invoice)
    .map(
      (l) =>
        `<tr><td>${escapeHtml(l.description)}</td><td class="n">${l.minutes}</td><td class="n">${inr(
          l.amount_paise,
        )}</td></tr>`,
    )
    .join("");

  const html = `<!doctype html><html><head><meta charset="utf-8"/>
<title>${invoice.invoice_number ?? "Invoice"} — RentGPU.space</title>
<style>
 body{font-family:ui-sans-serif,system-ui,sans-serif;color:#111;margin:40px;font-size:13px}
 h1{font-size:20px;margin:0 0 4px}
 .muted{color:#666}
 table{width:100%;border-collapse:collapse;margin-top:24px}
 th,td{border-bottom:1px solid #ddd;padding:8px 6px;text-align:left}
 .n{text-align:right;font-variant-numeric:tabular-nums}
 tfoot td{font-weight:600;border-bottom:none}
 .box{margin-top:24px;padding:12px;border:1px solid #ddd}
</style></head><body>
<h1>RentGPU.space</h1>
<div class="muted">Tax invoice · per-minute GPU compute</div>
<div class="box">
 <div><strong>Invoice</strong> ${invoice.invoice_number ?? "—"}</div>
 <div><strong>Billed to</strong> ${escapeHtml(org || "Customer")}</div>
 <div><strong>Period</strong> ${invoice.period_start} → ${invoice.period_end}</div>
 <div><strong>GSTIN</strong> ${escapeHtml(invoice.gst_number ?? "Not provided")}</div>
 <div><strong>Place of supply</strong> ${escapeHtml(invoice.place_of_supply)}</div>
 <div><strong>HSN/SAC</strong> 998315 (hosting and IT infrastructure)</div>
</div>
<table>
 <thead><tr><th>Description</th><th class="n">Minutes</th><th class="n">Amount</th></tr></thead>
 <tbody>${lines || '<tr><td colspan="3">No metered usage in this period.</td></tr>'}</tbody>
 <tfoot>
  <tr><td colspan="2">Compute subtotal</td><td class="n">${inr(invoice.compute_paise)}</td></tr>
  <tr><td colspan="2">Storage subtotal</td><td class="n">${inr(invoice.storage_paise)}</td></tr>
  <tr><td colspan="2">GST @ ${Math.round(invoice.gst_rate * 100)}%</td><td class="n">${inr(
    invoice.gst_paise,
  )}</td></tr>
  <tr><td colspan="2">Total payable</td><td class="n">${inr(invoice.total_paise)}</td></tr>
 </tfoot>
</table>
<p class="muted" style="margin-top:24px">Amounts in INR. Compute is metered per minute, rounded up.</p>
<script>window.onload=()=>window.print()</script>
</body></html>`;

  const win = window.open("", "_blank", "width=900,height=1100");
  if (!win) return false;
  win.document.write(html);
  win.document.close();
  return true;
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!,
  );
}
