import { afterEach, describe, expect, it, vi } from "vitest";

import type { InvoiceRecord } from "./invoice-export";
import {
  downloadInvoiceCsv,
  invoiceLines,
  printInvoicePdf,
} from "./invoice-export";

// Both exporters hand the browser a file; the DOM surface they touch is small
// enough to stub directly, which keeps the assertions on the generated
// content rather than on jsdom's plumbing.
type Download = { filename: string; content: string; type: string };

function captureDownload(): Download[] {
  const downloads: Download[] = [];
  let pending: { content: string; type: string } | undefined;

  class CapturingBlob {
    constructor(parts: string[], options: { type: string }) {
      pending = { content: parts.join(""), type: options.type };
    }
  }

  vi.stubGlobal("Blob", CapturingBlob);
  vi.stubGlobal("URL", {
    createObjectURL: () => "blob:invoice",
    revokeObjectURL: () => {},
  });
  vi.stubGlobal("document", {
    createElement: () => {
      const anchor = { href: "", download: "", click: () => {} };
      anchor.click = () => {
        downloads.push({ filename: anchor.download, ...pending! });
      };
      return anchor;
    },
  });

  return downloads;
}

function invoice(overrides: Partial<InvoiceRecord> = {}): InvoiceRecord {
  return {
    invoice_number: "RG-202603-4F3C2B",
    period_start: "2026-03-01",
    period_end: "2026-03-31",
    compute_paise: 12_345,
    storage_paise: 0,
    gst_paise: 2_222,
    total_paise: 14_567,
    gst_rate: 0.18,
    gst_number: "29ABCDE1234F1Z5",
    place_of_supply: "Karnataka",
    compute_minutes: 37,
    line_items: [
      { description: "Compute · trainer", minutes: 37, amount_paise: 12_345 },
    ],
    status: "issued",
    ...overrides,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("invoiceLines", () => {
  it("returns the stored line items", () => {
    expect(invoiceLines(invoice())).toEqual([
      { description: "Compute · trainer", minutes: 37, amount_paise: 12_345 },
    ]);
  });

  it.each([
    ["null", null],
    ["an object", { description: "x" }],
    ["a string", "[]"],
    ["undefined", undefined],
  ])("returns an empty list when line_items is %s", (_label, raw) => {
    expect(invoiceLines(invoice({ line_items: raw }))).toEqual([]);
  });
});

describe("downloadInvoiceCsv", () => {
  it("renders paise as two-decimal rupee amounts", () => {
    const downloads = captureDownload();

    downloadInvoiceCsv(invoice());
    const rows = downloads[0]!.content.split("\n");

    expect(rows).toContain('"Compute · trainer","37","123.45"');
    expect(rows).toContain('"Compute subtotal","37","123.45"');
    expect(rows).toContain('"Storage subtotal","","0.00"');
    expect(rows).toContain('"GST @ 18%","","22.22"');
    expect(rows).toContain('"Total payable","","145.67"');
  });

  it("pads a whole-rupee amount to two decimals", () => {
    const downloads = captureDownload();

    downloadInvoiceCsv(
      invoice({ total_paise: 10_000, line_items: [], compute_paise: 10_000 }),
    );

    expect(downloads[0]!.content).toContain('"Total payable","","100.00"');
  });

  it("names the file after the invoice, as CSV", () => {
    const downloads = captureDownload();

    downloadInvoiceCsv(invoice());

    expect(downloads[0]).toMatchObject({
      filename: "RG-202603-4F3C2B.csv",
      type: "text/csv;charset=utf-8",
    });
  });

  it("falls back to a generic filename and blank number", () => {
    const downloads = captureDownload();

    downloadInvoiceCsv(invoice({ invoice_number: null }));

    expect(downloads[0]!.filename).toBe("invoice.csv");
    expect(downloads[0]!.content.split("\n")[0]).toBe('"Invoice number",""');
  });

  it("doubles embedded quotes so the field stays one cell", () => {
    const downloads = captureDownload();

    downloadInvoiceCsv(
      invoice({
        line_items: [
          { description: 'Compute · "big" box', minutes: 1, amount_paise: 100 },
        ],
      }),
    );

    expect(downloads[0]!.content).toContain(
      '"Compute · ""big"" box","1","1.00"',
    );
  });

  it("says so when no GSTIN was provided", () => {
    const downloads = captureDownload();

    downloadInvoiceCsv(invoice({ gst_number: null }));

    expect(downloads[0]!.content).toContain('"GSTIN","Not provided"');
  });
});

describe("printInvoicePdf", () => {
  function captureWindow() {
    const document = { write: vi.fn(), close: vi.fn() };
    vi.stubGlobal("window", { open: () => ({ document }) });
    return document;
  }

  function html(record: InvoiceRecord, org = "Acme Labs") {
    const document = captureWindow();
    expect(printInvoicePdf(record, org)).toBe(true);
    return String(document.write.mock.calls[0]?.[0]);
  }

  it("formats the totals as rupee amounts", () => {
    const output = html(invoice());

    expect(output).toContain("₹123.45");
    expect(output).toContain("₹22.22");
    expect(output).toContain("₹145.67");
    expect(output).toContain("GST @ 18%");
  });

  it("escapes HTML in the instance name and the org", () => {
    const output = html(
      invoice({
        line_items: [
          {
            description: "<script>alert(1)</script>",
            minutes: 1,
            amount_paise: 100,
          },
        ],
      }),
      'Acme & "Co" <b>',
    );

    expect(output).not.toContain("<script>alert(1)</script>");
    expect(output).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(output).toContain("Acme &amp; &quot;Co&quot; &lt;b&gt;");
  });

  it("falls back to a placeholder customer name", () => {
    expect(html(invoice(), "")).toContain(
      "<strong>Billed to</strong> Customer",
    );
  });

  it("notes an empty period instead of an empty table", () => {
    const output = html(invoice({ line_items: [] }));

    expect(output).toContain("No metered usage in this period.");
  });

  it("reports failure when the popup is blocked", () => {
    vi.stubGlobal("window", { open: () => null });

    expect(printInvoicePdf(invoice(), "Acme Labs")).toBe(false);
  });
});
