import { supabaseAdmin } from "@/integrations/supabase/client.server";

const GST_RATE = 0.18;

function monthKey(iso: string) {
  const d = new Date(iso);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthBounds(key: string) {
  const [y, m] = key.split("-").map(Number);
  const start = new Date(Date.UTC(y!, m! - 1, 1));
  const end = new Date(Date.UTC(y!, m!, 0));
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

type Line = { description: string; minutes: number; amount_paise: number };

/**
 * Rolls per-minute metering into one GST-ready invoice per calendar month.
 * Idempotent: an existing invoice for a period is updated, not duplicated.
 */
export async function rebuildInvoices(userId: string) {
  const [{ data: txns, error }, { data: profile }, { data: instances }] =
    await Promise.all([
      supabaseAdmin
        .from("wallet_transactions")
        .select("amount_paise,description,created_at,kind")
        .eq("user_id", userId)
        .eq("kind", "usage")
        .order("created_at"),
      supabaseAdmin
        .from("profiles")
        .select("gst_number,org_name,country")
        .eq("id", userId)
        .maybeSingle(),
      supabaseAdmin
        .from("instances")
        .select("id,name,storage_gb,created_at")
        .eq("user_id", userId),
    ]);
  if (error) throw new Error(error.message);

  const byMonth = new Map<
    string,
    { compute: number; minutes: number; lines: Map<string, Line> }
  >();
  for (const t of txns ?? []) {
    const key = monthKey(t.created_at);
    const bucket = byMonth.get(key) ?? {
      compute: 0,
      minutes: 0,
      lines: new Map<string, Line>(),
    };
    const amount = Math.abs(t.amount_paise);
    const minutes = Number(/·\s(\d+)\smin/.exec(t.description)?.[1] ?? 0);
    const instanceRef =
      /instance\s([0-9a-f]{8})/.exec(t.description)?.[1] ?? "compute";
    const inst = (instances ?? []).find((i) => i.id.startsWith(instanceRef));
    const label = inst ? `Compute · ${inst.name}` : "Compute usage";
    const line = bucket.lines.get(label) ?? {
      description: label,
      minutes: 0,
      amount_paise: 0,
    };
    line.minutes += minutes;
    line.amount_paise += amount;
    bucket.lines.set(label, line);
    bucket.compute += amount;
    bucket.minutes += minutes;
    byMonth.set(key, bucket);
  }

  const results = [];
  for (const [key, bucket] of byMonth) {
    const { start, end } = monthBounds(key);
    const storage = 0;
    const net = bucket.compute + storage;
    const gst = Math.round(net * GST_RATE);
    const lines = [...bucket.lines.values()].sort(
      (a, b) => b.amount_paise - a.amount_paise,
    );

    const { data: existing } = await supabaseAdmin
      .from("invoices")
      .select("id,invoice_number")
      .eq("user_id", userId)
      .eq("period_start", start)
      .maybeSingle();

    const invoiceNumber =
      existing?.invoice_number ??
      `RG-${key.replace("-", "")}-${userId.slice(0, 6).toUpperCase()}`;

    const payload = {
      user_id: userId,
      period_start: start,
      period_end: end,
      compute_paise: bucket.compute,
      storage_paise: storage,
      gst_paise: gst,
      total_paise: net + gst,
      compute_minutes: bucket.minutes,
      gst_rate: GST_RATE,
      gst_number: profile?.gst_number ?? null,
      invoice_number: invoiceNumber,
      line_items: lines,
      status: "issued",
    };

    if (existing) {
      const { error: uErr } = await supabaseAdmin
        .from("invoices")
        .update(payload)
        .eq("id", existing.id);
      if (uErr) throw new Error(uErr.message);
      results.push({ invoice_number: invoiceNumber, updated: true });
    } else {
      const { error: iErr } = await supabaseAdmin
        .from("invoices")
        .insert(payload);
      if (iErr) throw new Error(iErr.message);
      results.push({ invoice_number: invoiceNumber, updated: false });
    }
  }

  return { invoices: results.length, detail: results };
}
