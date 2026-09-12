import { PublicError } from "./errors";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type InstanceRow = {
  id: string;
  user_id: string;
  status: string;
  price_inr_per_min_paise: number;
  spend_cap_paise: number | null;
  auto_shutdown_minutes: number | null;
  accrued_paise: number;
  billed_minutes: number;
  started_at: string | null;
  last_billed_at: string | null;
};

const MS_PER_MIN = 60_000;

function randomHex(len: number) {
  const chars = "0123456789abcdef";
  let out = "";
  for (let i = 0; i < len; i++)
    out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function randomIp() {
  return `103.${20 + Math.floor(Math.random() * 60)}.${Math.floor(Math.random() * 250)}.${
    2 + Math.floor(Math.random() * 250)
  }`;
}

export async function getWallet(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("wallets")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) {
    const { data: created, error: insErr } = await supabaseAdmin
      .from("wallets")
      .insert({ user_id: userId, balance_paise: 50000 })
      .select("*")
      .single();
    if (insErr) throw new Error(insErr.message);
    return created;
  }
  return data;
}

async function moveMoney(
  userId: string,
  amountPaise: number,
  kind: "topup" | "usage" | "refund" | "credit",
  description: string,
  extra?: { method?: string; reference?: string },
) {
  const wallet = await getWallet(userId);
  const next = Math.max(0, wallet.balance_paise + amountPaise);
  const { error } = await supabaseAdmin
    .from("wallets")
    .update({ balance_paise: next })
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  await supabaseAdmin.from("wallet_transactions").insert({
    user_id: userId,
    kind,
    amount_paise: amountPaise,
    balance_after_paise: next,
    description,
    method: extra?.method ?? "",
    reference: extra?.reference ?? "",
  });
  return next;
}

async function logEvent(
  instanceId: string,
  userId: string,
  event: string,
  detail = "",
) {
  await supabaseAdmin
    .from("instance_events")
    .insert({ instance_id: instanceId, user_id: userId, event, detail });
}

async function stopRow(inst: InstanceRow, reason: string, terminate = false) {
  await supabaseAdmin
    .from("instances")
    .update(
      terminate
        ? {
            status: "terminated",
            terminated_at: new Date().toISOString(),
            stopped_at: new Date().toISOString(),
          }
        : { status: "stopped", stopped_at: new Date().toISOString() },
    )
    .eq("id", inst.id);
  await logEvent(
    inst.id,
    inst.user_id,
    terminate ? "terminated" : "stopped",
    reason,
  );
  const { data: offerRow } = await supabaseAdmin
    .from("instances")
    .select("offer_id")
    .eq("id", inst.id)
    .single();
  if (offerRow?.offer_id) {
    const { data: offer } = await supabaseAdmin
      .from("provider_offers")
      .select("available_units,total_units")
      .eq("id", offerRow.offer_id)
      .single();
    if (offer) {
      await supabaseAdmin
        .from("provider_offers")
        .update({
          available_units: Math.min(
            offer.total_units,
            offer.available_units + 1,
          ),
        })
        .eq("id", offerRow.offer_id);
    }
  }
}

/** Charge accrued minutes. `final` rounds the partial minute up (per-minute billing). */
async function chargeInstance(inst: InstanceRow, final: boolean) {
  if (!inst.last_billed_at) return inst;
  const elapsed = Date.now() - new Date(inst.last_billed_at).getTime();
  const minutes = final
    ? Math.ceil(elapsed / MS_PER_MIN)
    : Math.floor(elapsed / MS_PER_MIN);
  if (minutes <= 0) return inst;

  const amount = minutes * inst.price_inr_per_min_paise;
  const accrued = inst.accrued_paise + amount;
  const nextBilled = new Date(
    new Date(inst.last_billed_at).getTime() + minutes * MS_PER_MIN,
  ).toISOString();

  await moveMoney(
    inst.user_id,
    -amount,
    "usage",
    `Compute · ${minutes} min · instance ${inst.id.slice(0, 8)}`,
  );
  await supabaseAdmin
    .from("instances")
    .update({
      accrued_paise: accrued,
      billed_minutes: inst.billed_minutes + minutes,
      last_billed_at: nextBilled,
    })
    .eq("id", inst.id);

  return {
    ...inst,
    accrued_paise: accrued,
    billed_minutes: inst.billed_minutes + minutes,
    last_billed_at: nextBilled,
  };
}

/** Meters every running instance for a user, applying caps and auto-shutdown. */
export async function meterUser(userId: string) {
  const { data: rows, error } = await supabaseAdmin
    .from("instances")
    .select(
      "id,user_id,status,price_inr_per_min_paise,spend_cap_paise,auto_shutdown_minutes,accrued_paise,billed_minutes,started_at,last_billed_at",
    )
    .eq("user_id", userId)
    .eq("status", "running");
  if (error) throw new Error(error.message);

  const shutdowns: string[] = [];
  for (const raw of (rows ?? []) as InstanceRow[]) {
    const inst = await chargeInstance(raw, false);
    const wallet = await getWallet(userId);

    if (inst.spend_cap_paise && inst.accrued_paise >= inst.spend_cap_paise) {
      await chargeInstance(inst, true);
      await stopRow(inst, "Spend cap reached");
      shutdowns.push(`${inst.id}:cap`);
      continue;
    }
    if (wallet.balance_paise <= 0) {
      await stopRow(inst, "Wallet balance exhausted");
      shutdowns.push(`${inst.id}:balance`);
      continue;
    }
    if (inst.auto_shutdown_minutes && inst.started_at) {
      const runMinutes =
        (Date.now() - new Date(inst.started_at).getTime()) / MS_PER_MIN;
      if (runMinutes >= inst.auto_shutdown_minutes) {
        await chargeInstance(inst, true);
        await stopRow(
          inst,
          `Auto-shutdown after ${inst.auto_shutdown_minutes} min`,
        );
        shutdowns.push(`${inst.id}:timer`);
      }
    }
  }

  const wallet = await getWallet(userId);
  return {
    metered: rows?.length ?? 0,
    shutdowns,
    balance_paise: wallet.balance_paise,
  };
}

export async function startInstance(
  userId: string,
  input: {
    offerId: string;
    templateId?: string | null | undefined;
    name: string;
    storageGb: number;
    spendCapPaise?: number | null | undefined;
    autoShutdownMinutes?: number | null | undefined;
  },
) {
  const { data: offer, error: offerErr } = await supabaseAdmin
    .from("provider_offers")
    .select("id,available_units,price_inr_per_min_paise,active,provider_id")
    .eq("id", input.offerId)
    .single();
  if (offerErr || !offer)
    throw new PublicError("That GPU offer is no longer available.", {
      status: 409,
      code: "offer_unavailable",
    });
  if (!offer.active || offer.available_units < 1)
    throw new PublicError("No units left on this offer right now.", {
      status: 409,
      code: "no_capacity",
    });

  const wallet = await getWallet(userId);
  const minimum = offer.price_inr_per_min_paise * 10;
  if (wallet.balance_paise < minimum) {
    throw new PublicError(
      `Add credit first — you need at least ₹${(minimum / 100).toFixed(2)} to start this GPU.`,
      { status: 402, code: "insufficient_balance" },
    );
  }

  const now = new Date().toISOString();
  const { data: instance, error } = await supabaseAdmin
    .from("instances")
    .insert({
      user_id: userId,
      offer_id: offer.id,
      template_id: input.templateId ?? null,
      name: input.name,
      status: "running",
      price_inr_per_min_paise: offer.price_inr_per_min_paise,
      storage_gb: input.storageGb,
      spend_cap_paise: input.spendCapPaise ?? null,
      auto_shutdown_minutes: input.autoShutdownMinutes ?? null,
      ssh_host: `${randomHex(6)}.node.rentgpu.space`,
      ssh_port: 20000 + Math.floor(Math.random() * 9000),
      public_ip: randomIp(),
      jupyter_token: randomHex(24),
      started_at: now,
      last_billed_at: now,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  await supabaseAdmin
    .from("provider_offers")
    .update({ available_units: offer.available_units - 1 })
    .eq("id", offer.id);
  await logEvent(
    instance.id,
    userId,
    "started",
    `Deployed on offer ${offer.id.slice(0, 8)}`,
  );

  return { id: instance.id };
}

export async function stopInstance(
  userId: string,
  instanceId: string,
  terminate: boolean,
) {
  const { data, error } = await supabaseAdmin
    .from("instances")
    .select(
      "id,user_id,status,price_inr_per_min_paise,spend_cap_paise,auto_shutdown_minutes,accrued_paise,billed_minutes,started_at,last_billed_at",
    )
    .eq("id", instanceId)
    .eq("user_id", userId)
    .single();
  if (error || !data)
    throw new PublicError("Instance not found.", {
      status: 404,
      code: "not_found",
    });
  const inst = data as InstanceRow;

  if (inst.status === "running") {
    const charged = await chargeInstance(inst, true);
    await stopRow(
      charged,
      terminate ? "Terminated by user" : "Stopped by user",
      terminate,
    );
  } else if (terminate) {
    await supabaseAdmin
      .from("instances")
      .update({ status: "terminated", terminated_at: new Date().toISOString() })
      .eq("id", inst.id);
    await logEvent(inst.id, userId, "terminated", "Terminated by user");
  }
  return { ok: true };
}

export async function resumeInstance(userId: string, instanceId: string) {
  const { data: inst, error } = await supabaseAdmin
    .from("instances")
    .select("id,status,offer_id,price_inr_per_min_paise")
    .eq("id", instanceId)
    .eq("user_id", userId)
    .single();
  if (error || !inst)
    throw new PublicError("Instance not found.", {
      status: 404,
      code: "not_found",
    });
  if (inst.status !== "stopped")
    throw new PublicError("Only stopped instances can be resumed.", {
      status: 409,
      code: "invalid_state",
    });

  const { data: offer } = await supabaseAdmin
    .from("provider_offers")
    .select("id,available_units")
    .eq("id", inst.offer_id)
    .single();
  if (!offer || offer.available_units < 1)
    throw new PublicError("The provider has no free units right now.", {
      status: 409,
      code: "no_capacity",
    });

  const wallet = await getWallet(userId);
  if (wallet.balance_paise < inst.price_inr_per_min_paise * 10) {
    throw new PublicError("Add credit before resuming this instance.", {
      status: 402,
      code: "insufficient_balance",
    });
  }

  const now = new Date().toISOString();
  await supabaseAdmin
    .from("instances")
    .update({
      status: "running",
      started_at: now,
      last_billed_at: now,
      stopped_at: null,
    })
    .eq("id", inst.id);
  await supabaseAdmin
    .from("provider_offers")
    .update({ available_units: offer.available_units - 1 })
    .eq("id", offer.id);
  await logEvent(inst.id, userId, "started", "Resumed by user");
  return { ok: true };
}

const METHOD_LABELS: Record<string, string> = {
  upi_intent: "UPI app",
  upi_id: "UPI ID",
  upi_qr: "UPI QR",
  netbanking: "Net banking",
  wallet: "Prepaid wallet",
  card: "Card",
  rtgs: "NEFT / RTGS",
};

export async function topUpWallet(
  userId: string,
  amountPaise: number,
  method: string,
  detail = "",
) {
  const label = METHOD_LABELS[method] ?? method;
  const reference = `RG${Date.now().toString(36).toUpperCase()}${randomHex(4).toUpperCase()}`;
  const suffix = detail ? ` · ${detail}` : "";
  const balance = await moveMoney(
    userId,
    amountPaise,
    "topup",
    `Top-up via ${label}${suffix}`,
    {
      method,
      reference,
    },
  );
  return { balance_paise: balance, reference, method: label };
}

/** Deploys a one-click AI template on the cheapest offer that can run it. */
export async function oneClickLaunch(
  userId: string,
  templateSlug: string,
  name?: string,
) {
  const { data: template, error: tErr } = await supabaseAdmin
    .from("templates")
    .select(
      "id,slug,name,min_vram_gb,default_storage_gb,default_auto_shutdown_minutes",
    )
    .eq("slug", templateSlug)
    .maybeSingle();
  if (tErr) throw new Error(tErr.message);
  if (!template)
    throw new PublicError("That template is no longer available.", {
      status: 409,
      code: "template_unavailable",
    });

  const { data: offers, error: oErr } = await supabaseAdmin
    .from("provider_offers")
    .select(
      "id,available_units,price_inr_per_min_paise,gpu_types(vram_gb,model)",
    )
    .eq("active", true)
    .gt("available_units", 0)
    .order("price_inr_per_min_paise");
  if (oErr) throw new Error(oErr.message);

  const match = (offers ?? []).find(
    (o) => (o.gpu_types?.vram_gb ?? 0) >= template.min_vram_gb,
  );
  if (!match) {
    throw new PublicError(
      `No GPU with at least ${template.min_vram_gb} GB VRAM is free right now. Try again shortly.`,
      { status: 409, code: "no_capacity" },
    );
  }

  const created = await startInstance(userId, {
    offerId: match.id,
    templateId: template.id,
    name: name?.trim() || `${template.slug}-${randomHex(3)}`,
    storageGb: template.default_storage_gb,
    spendCapPaise: null,
    autoShutdownMinutes: template.default_auto_shutdown_minutes,
  });

  return {
    id: created.id,
    gpu: match.gpu_types?.model ?? "GPU",
    price_inr_per_min_paise: match.price_inr_per_min_paise,
    template: template.name,
  };
}

export async function applyAsProvider(
  userId: string,
  input: {
    companyName: string;
    region: string;
    country: string;
    datacentreTier: string;
    networkGbps: number;
    contactEmail: string;
    notes: string;
  },
) {
  const { data, error } = await supabaseAdmin
    .from("providers")
    .insert({
      owner_id: userId,
      company_name: input.companyName,
      region: input.region,
      country: input.country,
      datacentre_tier: input.datacentreTier,
      network_gbps: input.networkGbps,
      contact_email: input.contactEmail,
      notes: input.notes,
      verification_status: "pending",
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  await supabaseAdmin
    .from("user_roles")
    .upsert(
      { user_id: userId, role: "provider" },
      { onConflict: "user_id,role" },
    );
  return { id: data.id };
}
