import { beforeEach, describe, expect, it, vi } from "vitest";

// rebuildInvoices is one Supabase round-trip per table, so the client is
// stubbed at the module boundary: the fixtures below are the rows it would
// have read, and `written` captures the invoice payloads it would have
// written. Nothing here needs SUPABASE_* in the environment.
type Txn = {
  amount_paise: number;
  description: string;
  created_at: string;
  kind: string;
};
type InvoicePayload = Record<string, unknown>;

type Fixtures = {
  txns: Txn[];
  txnError: { message: string } | null;
  profile: { gst_number: string | null } | null;
  instances: { id: string; name: string }[];
  existingInvoice: { id: string; invoice_number: string } | null;
  writeError: { message: string } | null;
};

let db: Fixtures;
let written: { op: "insert" | "update"; payload: InvoicePayload }[];

vi.mock("@/integrations/supabase/client.server", () => {
  function thenable<T>(value: T) {
    const chain: Record<string, unknown> = {};
    for (const method of ["select", "eq", "order"]) {
      chain[method] = () => chain;
    }
    chain["maybeSingle"] = () => Promise.resolve(value);
    chain["then"] = (
      onFulfilled: (v: T) => unknown,
      onRejected?: (e: unknown) => unknown,
    ) => Promise.resolve(value).then(onFulfilled, onRejected);
    return chain;
  }

  return {
    supabaseAdmin: {
      from(table: string) {
        if (table === "wallet_transactions")
          return thenable({ data: db.txns, error: db.txnError });
        if (table === "profiles") return thenable({ data: db.profile });
        if (table === "instances")
          return thenable({ data: db.instances, error: null });
        return {
          ...thenable({ data: db.existingInvoice, error: null }),
          insert: (payload: InvoicePayload) => {
            written.push({ op: "insert", payload });
            return Promise.resolve({ error: db.writeError });
          },
          update: (payload: InvoicePayload) => {
            written.push({ op: "update", payload });
            return { eq: () => Promise.resolve({ error: db.writeError }) };
          },
        };
      },
    },
  };
});

async function rebuild(userId = "4f3c2b1a-0000-4000-8000-000000000000") {
  vi.resetModules();
  const { rebuildInvoices } = await import("./billing.server");
  return rebuildInvoices(userId);
}

function usage(
  amount_paise: number,
  minutes: number,
  instanceId: string,
  created_at: string,
): Txn {
  return {
    amount_paise,
    // The exact string rentgpu.server.ts writes when it meters a stop.
    description: `Compute · ${minutes} min · instance ${instanceId.slice(0, 8)}`,
    created_at,
    kind: "usage",
  };
}

beforeEach(() => {
  db = {
    txns: [],
    txnError: null,
    profile: { gst_number: null },
    instances: [],
    existingInvoice: null,
    writeError: null,
  };
  written = [];
});

describe("rebuildInvoices", () => {
  it("writes nothing when there is no metered usage", async () => {
    const result = await rebuild();

    expect(result).toEqual({ invoices: 0, detail: [] });
    expect(written).toEqual([]);
  });

  it("sums a month's usage into compute, GST and total paise", async () => {
    db.txns = [
      usage(-10_000, 30, "aaaaaaaa1111", "2026-03-04T10:00:00.000Z"),
      usage(-2_345, 7, "aaaaaaaa1111", "2026-03-19T10:00:00.000Z"),
    ];

    await rebuild();

    // Debits are stored negative; an invoice bills their magnitude.
    expect(written[0]?.payload).toMatchObject({
      compute_paise: 12_345,
      storage_paise: 0,
      // 12345 * 0.18 = 2222.1
      gst_paise: 2_222,
      total_paise: 14_567,
      compute_minutes: 37,
      gst_rate: 0.18,
    });
  });

  it("rounds a half-paise of GST up", async () => {
    db.txns = [usage(-25, 1, "aaaaaaaa1111", "2026-03-04T10:00:00.000Z")];

    await rebuild();

    // 25 * 0.18 = 4.5
    expect(written[0]?.payload).toMatchObject({
      gst_paise: 5,
      total_paise: 30,
    });
  });

  it("keeps GST an integer number of paise on amounts that float badly", async () => {
    db.txns = [
      usage(-1_000_000, 60, "aaaaaaaa1111", "2026-03-04T10:00:00.000Z"),
    ];

    await rebuild();

    const { gst_paise, total_paise } = written[0]?.payload ?? {};
    // 1000000 * 0.18 is 180000.00000000003 in IEEE 754.
    expect(gst_paise).toBe(180_000);
    expect(Number.isInteger(gst_paise)).toBe(true);
    expect(total_paise).toBe(1_180_000);
  });

  it("splits usage into one invoice per calendar month", async () => {
    db.txns = [
      usage(-100, 1, "aaaaaaaa1111", "2026-03-31T23:59:00.000Z"),
      usage(-200, 2, "aaaaaaaa1111", "2026-04-01T00:01:00.000Z"),
    ];

    const result = await rebuild();

    expect(result.invoices).toBe(2);
    expect(
      written.map((w) => [
        w.payload["period_start"],
        w.payload["period_end"],
        w.payload["compute_paise"],
      ]),
    ).toEqual([
      ["2026-03-01", "2026-03-31", 100],
      ["2026-04-01", "2026-04-30", 200],
    ]);
  });

  it("ends a February period on the leap day", async () => {
    db.txns = [usage(-100, 1, "aaaaaaaa1111", "2028-02-10T00:00:00.000Z")];

    await rebuild();

    expect(written[0]?.payload).toMatchObject({
      period_start: "2028-02-01",
      period_end: "2028-02-29",
    });
  });

  it("groups line items by instance and sorts them by amount", async () => {
    db.instances = [
      { id: "aaaaaaaa-1111-4000-8000-000000000000", name: "trainer" },
      { id: "bbbbbbbb-2222-4000-8000-000000000000", name: "notebook" },
    ];
    db.txns = [
      usage(-100, 5, "aaaaaaaa-1111", "2026-03-02T00:00:00.000Z"),
      usage(-900, 45, "bbbbbbbb-2222", "2026-03-03T00:00:00.000Z"),
      usage(-300, 15, "aaaaaaaa-1111", "2026-03-04T00:00:00.000Z"),
    ];

    await rebuild();

    expect(written[0]?.payload["line_items"]).toEqual([
      { description: "Compute · notebook", minutes: 45, amount_paise: 900 },
      { description: "Compute · trainer", minutes: 20, amount_paise: 400 },
    ]);
  });

  it("falls back to a generic line when the instance is gone", async () => {
    db.txns = [usage(-500, 10, "cccccccc-3333", "2026-03-02T00:00:00.000Z")];

    await rebuild();

    expect(written[0]?.payload["line_items"]).toEqual([
      { description: "Compute usage", minutes: 10, amount_paise: 500 },
    ]);
  });

  it("mints an invoice number from the month and the user id", async () => {
    db.txns = [usage(-100, 1, "aaaaaaaa1111", "2026-03-02T00:00:00.000Z")];

    const result = await rebuild("4f3c2b1a-0000-4000-8000-000000000000");

    expect(result.detail).toEqual([
      { invoice_number: "RG-202603-4F3C2B", updated: false },
    ]);
    expect(written[0]).toMatchObject({ op: "insert" });
  });

  it("updates an existing period and keeps its invoice number", async () => {
    db.existingInvoice = { id: "inv-1", invoice_number: "RG-202603-ORIGIN" };
    db.txns = [usage(-100, 1, "aaaaaaaa1111", "2026-03-02T00:00:00.000Z")];

    const result = await rebuild();

    expect(result.detail).toEqual([
      { invoice_number: "RG-202603-ORIGIN", updated: true },
    ]);
    expect(written).toHaveLength(1);
    expect(written[0]?.op).toBe("update");
    expect(written[0]?.payload["invoice_number"]).toBe("RG-202603-ORIGIN");
  });

  it("copies the profile's GSTIN onto the invoice", async () => {
    db.profile = { gst_number: "29ABCDE1234F1Z5" };
    db.txns = [usage(-100, 1, "aaaaaaaa1111", "2026-03-02T00:00:00.000Z")];

    await rebuild();

    expect(written[0]?.payload["gst_number"]).toBe("29ABCDE1234F1Z5");
  });

  it("leaves the GSTIN null when there is no profile", async () => {
    db.profile = null;
    db.txns = [usage(-100, 1, "aaaaaaaa1111", "2026-03-02T00:00:00.000Z")];

    await rebuild();

    expect(written[0]?.payload["gst_number"]).toBeNull();
  });

  it("throws when the usage read fails", async () => {
    db.txnError = { message: "permission denied for wallet_transactions" };

    await expect(rebuild()).rejects.toThrow(
      "permission denied for wallet_transactions",
    );
    expect(written).toEqual([]);
  });

  it("throws when the invoice write fails", async () => {
    db.txns = [usage(-100, 1, "aaaaaaaa1111", "2026-03-02T00:00:00.000Z")];
    db.writeError = { message: "duplicate key value" };

    await expect(rebuild()).rejects.toThrow("duplicate key value");
  });
});
