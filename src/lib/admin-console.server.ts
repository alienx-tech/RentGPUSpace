import type { SupabaseClient } from "@supabase/supabase-js";

import { audit } from "./audit.server";
import { PublicError } from "./errors";
import type { HeaderSource } from "./observability";
import type { Permission } from "./permissions";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Database } from "@/integrations/supabase/types";
import type {
  ExtraClient,
  JsonValue,
} from "@/integrations/supabase/types.extra";

// Tables added after types.ts was generated — see types.extra.ts.
const extraDb = supabaseAdmin as unknown as ExtraClient;

/** The request-scoped (RLS-bound) client the middleware hands to server functions. */
export type PermissionCapableClient = Pick<SupabaseClient<Database>, "rpc">;

/**
 * has_permission() postdates the generated types.ts, so the client's rpc
 * signature does not list it. Narrowed here, at the single call site, rather
 * than loosening the parameter type everywhere.
 */
type HasPermissionRpc = (
  fn: "has_permission",
  args: { _user_id: string; _permission: Permission },
) => PromiseLike<{ data: unknown }>;

/**
 * Gate for every console read and write.
 *
 * Runs through the caller's own RLS-bound client so the check reads the same
 * has_permission() the row policies use — a service-role check would answer
 * for the wrong identity.
 */
export async function assertPermission(
  supabase: PermissionCapableClient,
  userId: string,
  permission: Permission,
): Promise<void> {
  const { data } = await (supabase.rpc as unknown as HasPermissionRpc)(
    "has_permission",
    {
      _user_id: userId,
      _permission: permission,
    },
  );
  if (data !== true) {
    throw new PublicError(`Missing permission: ${permission}`, {
      status: 403,
      code: "forbidden",
    });
  }
}

/** Permissions held by the caller, for deciding what the console renders. */
export async function listMyPermissions(userId: string): Promise<Permission[]> {
  const { data: roles } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  const held = (roles ?? []).map((r) => r.role);
  if (!held.length) return [];

  const { data } = await extraDb
    .from("role_permissions")
    .select("permission")
    .in("role", held);

  return [...new Set((data ?? []).map((r) => r.permission))];
}

// ---------------------------------------------------------------- dashboard

export type RangeKey = "24h" | "7d" | "30d" | "90d";

const RANGE_HOURS: Record<RangeKey, number> = {
  "24h": 24,
  "7d": 24 * 7,
  "30d": 24 * 30,
  "90d": 24 * 90,
};

export function rangeStart(range: RangeKey): string {
  return new Date(Date.now() - RANGE_HOURS[range] * 3_600_000).toISOString();
}

export type PlatformOverview = {
  users: { total: number; active: number };
  providers: { total: number; verified: number; pending: number };
  gpus: {
    total: number;
    available: number;
    rented: number;
    utilizationPct: number;
  };
  instances: { running: number; startedInRange: number; failedInRange: number };
  revenue: {
    todayPaise: number;
    rangePaise: number;
    commissionPaise: number;
    payoutPaise: number;
  };
  support: { open: number };
};

/**
 * One pass over the tables the dashboard tiles need. Counts come back as
 * head-only queries so the rows themselves never cross the wire.
 */
export async function platformOverview(
  supabase: PermissionCapableClient,
  userId: string,
  range: RangeKey,
): Promise<PlatformOverview> {
  await assertPermission(supabase, userId, "admin.access");

  const since = rangeStart(range);
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [{ count: totalUsers }, { count: openTickets }] = await Promise.all([
    supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
    supabaseAdmin
      .from("support_tickets")
      .select("id", { count: "exact", head: true })
      .in("status", ["open", "pending"]),
  ]);

  const [{ data: providers }, { data: offers }, { data: instances }] =
    await Promise.all([
      supabaseAdmin.from("providers").select("id,verification_status"),
      supabaseAdmin
        .from("provider_offers")
        .select("total_units,available_units,active,payout_rate"),
      supabaseAdmin
        .from("instances")
        .select("id,user_id,status,accrued_paise,created_at,started_at")
        .gte("created_at", since),
    ]);

  const liveOffers = (offers ?? []).filter((o) => o.active);
  const totalGpus = liveOffers.reduce((n, o) => n + o.total_units, 0);
  const availableGpus = liveOffers.reduce((n, o) => n + o.available_units, 0);
  const rented = totalGpus - availableGpus;

  const running = (instances ?? []).filter((i) => i.status === "running");
  const failed = (instances ?? []).filter((i) => i.status === "failed");

  const rangePaise = (instances ?? []).reduce(
    (n, i) => n + (i.accrued_paise ?? 0),
    0,
  );
  const todayPaise = (instances ?? [])
    .filter((i) => new Date(i.created_at) >= startOfToday)
    .reduce((n, i) => n + (i.accrued_paise ?? 0), 0);

  // Commission is the slice of customer spend the platform keeps; the rest is
  // owed to providers. payout_rate varies per offer, so use the live average.
  const avgPayoutRate = liveOffers.length
    ? liveOffers.reduce((n, o) => n + Number(o.payout_rate ?? 0.82), 0) /
      liveOffers.length
    : 0.82;
  const payoutPaise = Math.round(rangePaise * avgPayoutRate);

  return {
    users: {
      total: totalUsers ?? 0,
      active: new Set((instances ?? []).map((i) => i.user_id)).size,
    },
    providers: {
      total: (providers ?? []).length,
      verified: (providers ?? []).filter(
        (p) => p.verification_status === "verified",
      ).length,
      pending: (providers ?? []).filter(
        (p) => p.verification_status !== "verified",
      ).length,
    },
    gpus: {
      total: totalGpus,
      available: availableGpus,
      rented,
      utilizationPct: totalGpus > 0 ? (rented / totalGpus) * 100 : 0,
    },
    instances: {
      running: running.length,
      startedInRange: (instances ?? []).length,
      failedInRange: failed.length,
    },
    revenue: {
      todayPaise,
      rangePaise,
      commissionPaise: rangePaise - payoutPaise,
      payoutPaise,
    },
    support: { open: openTickets ?? 0 },
  };
}

// -------------------------------------------------------------------- users

export type AdminUserRow = {
  id: string;
  email: string;
  displayName: string;
  orgName: string;
  country: string;
  roles: string[];
  balancePaise: number;
  spendPaise: number;
  instances: number;
  joinedAt: string;
};

/**
 * Cross-tenant user list. profiles is "own profile" under RLS, so an admin can
 * never read this through their own client — it has to come from here.
 */
export async function listUsers(
  supabase: PermissionCapableClient,
  userId: string,
  search: string,
  limit = 100,
): Promise<AdminUserRow[]> {
  await assertPermission(supabase, userId, "users.read");

  let query = supabaseAdmin
    .from("profiles")
    .select("id,display_name,org_name,country,created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  const term = search.trim();
  if (term)
    query = query.or(`display_name.ilike.%${term}%,org_name.ilike.%${term}%`);

  const { data: profiles, error } = await query;
  if (error) throw new Error(error.message);

  const ids = (profiles ?? []).map((p) => p.id);
  if (!ids.length) return [];

  const [{ data: wallets }, { data: roles }, { data: instances }] =
    await Promise.all([
      supabaseAdmin
        .from("wallets")
        .select("user_id,balance_paise")
        .in("user_id", ids),
      supabaseAdmin
        .from("user_roles")
        .select("user_id,role")
        .in("user_id", ids),
      supabaseAdmin
        .from("instances")
        .select("user_id,accrued_paise")
        .in("user_id", ids),
    ]);

  const balance = new Map(
    (wallets ?? []).map((w) => [w.user_id, w.balance_paise]),
  );
  const rolesByUser = new Map<string, string[]>();
  for (const r of roles ?? []) {
    rolesByUser.set(r.user_id, [...(rolesByUser.get(r.user_id) ?? []), r.role]);
  }
  const spend = new Map<string, { total: number; count: number }>();
  for (const i of instances ?? []) {
    const current = spend.get(i.user_id) ?? { total: 0, count: 0 };
    spend.set(i.user_id, {
      total: current.total + (i.accrued_paise ?? 0),
      count: current.count + 1,
    });
  }

  const emails = await lookupEmails(ids);

  return (profiles ?? []).map((p) => ({
    id: p.id,
    email: emails.get(p.id) ?? "unknown",
    displayName: p.display_name,
    orgName: p.org_name,
    country: p.country,
    roles: rolesByUser.get(p.id) ?? ["user"],
    balancePaise: balance.get(p.id) ?? 0,
    spendPaise: spend.get(p.id)?.total ?? 0,
    instances: spend.get(p.id)?.count ?? 0,
    joinedAt: p.created_at,
  }));
}

/** Emails live in auth.users, which has no PostgREST surface — one admin call each. */
async function lookupEmails(ids: string[]): Promise<Map<string, string>> {
  const emails = new Map<string, string>();
  await Promise.all(
    ids.map(async (id) => {
      const { data } = await supabaseAdmin.auth.admin.getUserById(id);
      if (data.user?.email) emails.set(id, data.user.email);
    }),
  );
  return emails;
}

// ---------------------------------------------------------------- inventory

export type AdminOfferRow = {
  id: string;
  gpu: string;
  vramGb: number;
  tier: string;
  provider: string;
  providerId: string;
  region: string;
  country: string;
  available: number;
  total: number;
  pricePaisePerMin: number;
  payoutRate: number;
  active: boolean;
  isSpot: boolean;
  uptimePct: number;
};

export async function listInventory(
  supabase: PermissionCapableClient,
  userId: string,
): Promise<AdminOfferRow[]> {
  await assertPermission(supabase, userId, "gpus.read");

  const { data, error } = await supabaseAdmin
    .from("provider_offers")
    .select(
      "id,available_units,total_units,price_inr_per_min_paise,payout_rate,active,is_spot,gpu_types(model,vram_gb,tier),providers(id,company_name,region,country,uptime_pct)",
    )
    .order("price_inr_per_min_paise");
  if (error) throw new Error(error.message);

  return (data ?? []).map((o) => ({
    id: o.id,
    gpu: o.gpu_types?.model ?? "—",
    vramGb: o.gpu_types?.vram_gb ?? 0,
    tier: o.gpu_types?.tier ?? "—",
    provider: o.providers?.company_name ?? "—",
    providerId: o.providers?.id ?? "",
    region: o.providers?.region ?? "—",
    country: o.providers?.country ?? "—",
    available: o.available_units,
    total: o.total_units,
    pricePaisePerMin: o.price_inr_per_min_paise,
    payoutRate: Number(o.payout_rate ?? 0.82),
    active: o.active,
    isSpot: o.is_spot ?? false,
    uptimePct: Number(o.providers?.uptime_pct ?? 0),
  }));
}

// ---------------------------------------------------------------- instances

export type AdminInstanceRow = {
  id: string;
  name: string;
  status: string;
  userId: string;
  userEmail: string;
  gpu: string;
  region: string;
  template: string | null;
  pricePaisePerMin: number;
  accruedPaise: number;
  billedMinutes: number;
  createdAt: string;
  startedAt: string | null;
  stoppedAt: string | null;
};

export async function listInstances(
  supabase: PermissionCapableClient,
  userId: string,
  status: string,
  limit = 200,
): Promise<AdminInstanceRow[]> {
  await assertPermission(supabase, userId, "instances.read");

  let query = supabaseAdmin
    .from("instances")
    .select(
      "id,name,status,user_id,price_inr_per_min_paise,accrued_paise,billed_minutes,created_at,started_at,stopped_at,templates(name),provider_offers(gpu_types(model),providers(region))",
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status !== "all") query = query.eq("status", status);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const emails = await lookupEmails([
    ...new Set((data ?? []).map((i) => i.user_id)),
  ]);

  return (data ?? []).map((i) => ({
    id: i.id,
    name: i.name,
    status: i.status,
    userId: i.user_id,
    userEmail: emails.get(i.user_id) ?? "unknown",
    gpu: i.provider_offers?.gpu_types?.model ?? "—",
    region: i.provider_offers?.providers?.region ?? "—",
    template: i.templates?.name ?? null,
    pricePaisePerMin: i.price_inr_per_min_paise,
    accruedPaise: i.accrued_paise ?? 0,
    billedMinutes: i.billed_minutes ?? 0,
    createdAt: i.created_at,
    startedAt: i.started_at,
    stoppedAt: i.stopped_at,
  }));
}

// ---------------------------------------------------------------- audit log

export type AuditEntryRow = {
  id: number;
  actorEmail: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  previous: JsonValue;
  next: JsonValue;
  ip: string | null;
  createdAt: string;
};

export async function listAuditLog(
  supabase: PermissionCapableClient,
  userId: string,
  limit = 100,
): Promise<AuditEntryRow[]> {
  await assertPermission(supabase, userId, "audit.read");

  const { data, error } = await extraDb
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);

  return (data ?? []).map((r) => ({
    id: r.id,
    actorEmail: r.actor_email,
    action: r.action,
    resourceType: r.resource_type,
    resourceId: r.resource_id,
    previous: r.previous,
    next: r.next,
    ip: r.ip,
    createdAt: r.created_at,
  }));
}

// -------------------------------------------------------------- mutations
// Every one of these records an audit_logs row. The audit write comes after
// the change succeeds and before the result returns, so the trail never
// claims something that did not happen.

async function actorEmail(userId: string): Promise<string> {
  const { data } = await supabaseAdmin.auth.admin.getUserById(userId);
  return data.user?.email ?? "";
}

/** Takes an offer off the marketplace, or puts it back. */
export async function setOfferActive(
  supabase: PermissionCapableClient,
  actorId: string,
  input: { offerId: string; active: boolean },
  request?: HeaderSource,
) {
  await assertPermission(supabase, actorId, "gpus.write");

  const { data: before } = await supabaseAdmin
    .from("provider_offers")
    .select("id,active")
    .eq("id", input.offerId)
    .maybeSingle();
  if (!before)
    throw new PublicError("Offer not found.", {
      status: 404,
      code: "not_found",
    });

  const { error } = await supabaseAdmin
    .from("provider_offers")
    .update({ active: input.active })
    .eq("id", input.offerId);
  if (error) throw new Error(error.message);

  await audit(
    {
      actorId,
      actorEmail: await actorEmail(actorId),
      action: input.active ? "offer.enabled" : "offer.disabled",
      resourceType: "provider_offer",
      resourceId: input.offerId,
      previous: { active: before.active },
      next: { active: input.active },
    },
    request,
  );

  return { ok: true, active: input.active };
}

/** Repricing is a money change, so the old and new price both go on the record. */
export async function setOfferPrice(
  supabase: PermissionCapableClient,
  actorId: string,
  input: { offerId: string; pricePaisePerMin: number },
  request?: HeaderSource,
) {
  await assertPermission(supabase, actorId, "pricing.write");

  const { data: before } = await supabaseAdmin
    .from("provider_offers")
    .select("id,price_inr_per_min_paise")
    .eq("id", input.offerId)
    .maybeSingle();
  if (!before)
    throw new PublicError("Offer not found.", {
      status: 404,
      code: "not_found",
    });

  const { error } = await supabaseAdmin
    .from("provider_offers")
    .update({ price_inr_per_min_paise: input.pricePaisePerMin })
    .eq("id", input.offerId);
  if (error) throw new Error(error.message);

  await audit(
    {
      actorId,
      actorEmail: await actorEmail(actorId),
      action: "offer.repriced",
      resourceType: "provider_offer",
      resourceId: input.offerId,
      previous: { price_inr_per_min_paise: before.price_inr_per_min_paise },
      next: { price_inr_per_min_paise: input.pricePaisePerMin },
    },
    request,
  );

  return { ok: true };
}

/**
 * Force-terminates someone else's instance.
 *
 * Reuses stopInstance so the customer is billed for elapsed time and the
 * provider's units are returned exactly as they would be on a normal stop —
 * an admin path that skipped that would silently corrupt capacity accounting.
 */
export async function terminateInstanceAsAdmin(
  supabase: PermissionCapableClient,
  actorId: string,
  input: { instanceId: string; reason: string },
  request?: HeaderSource,
) {
  await assertPermission(supabase, actorId, "instances.write");

  const { data: instance } = await supabaseAdmin
    .from("instances")
    .select("id,user_id,status,name")
    .eq("id", input.instanceId)
    .maybeSingle();
  if (!instance) {
    throw new PublicError("Instance not found.", {
      status: 404,
      code: "not_found",
    });
  }

  const { stopInstance } = await import("./rentgpu.server");
  await stopInstance(instance.user_id, input.instanceId, true);

  await audit(
    {
      actorId,
      actorEmail: await actorEmail(actorId),
      action: "instance.force_terminated",
      resourceType: "instance",
      resourceId: input.instanceId,
      previous: { status: instance.status },
      next: { status: "terminated" },
      metadata: {
        reason: input.reason,
        owner: instance.user_id,
        name: instance.name,
      },
    },
    request,
  );

  return { ok: true };
}

/**
 * Moves credit into or out of a customer wallet.
 *
 * Writes the ledger row as well as the balance so the wallet's own transaction
 * history explains the change, rather than the balance shifting unexplained.
 */
export async function adjustWalletCredit(
  supabase: PermissionCapableClient,
  actorId: string,
  input: { userId: string; amountPaise: number; reason: string },
  request?: HeaderSource,
) {
  await assertPermission(supabase, actorId, "users.credit");

  const { data: wallet } = await supabaseAdmin
    .from("wallets")
    .select("user_id,balance_paise")
    .eq("user_id", input.userId)
    .maybeSingle();
  if (!wallet) {
    throw new PublicError("Wallet not found for that user.", {
      status: 404,
      code: "not_found",
    });
  }

  const next = wallet.balance_paise + input.amountPaise;
  if (next < 0) {
    throw new PublicError("That adjustment would take the wallet below zero.", {
      status: 409,
      code: "invalid_amount",
    });
  }

  const { error } = await supabaseAdmin
    .from("wallets")
    .update({ balance_paise: next })
    .eq("user_id", input.userId);
  if (error) throw new Error(error.message);

  await supabaseAdmin.from("wallet_transactions").insert({
    user_id: input.userId,
    kind: input.amountPaise >= 0 ? "credit" : "debit",
    amount_paise: input.amountPaise,
    balance_after_paise: next,
    description: `Admin adjustment — ${input.reason}`,
  });

  await audit(
    {
      actorId,
      actorEmail: await actorEmail(actorId),
      action: input.amountPaise >= 0 ? "wallet.credited" : "wallet.debited",
      resourceType: "wallet",
      resourceId: input.userId,
      previous: { balance_paise: wallet.balance_paise },
      next: { balance_paise: next },
      metadata: { amount_paise: input.amountPaise, reason: input.reason },
    },
    request,
  );

  return { ok: true, balancePaise: next };
}

// ---------------------------------------------------------------- providers

export type AdminProviderRow = {
  id: string;
  companyName: string;
  region: string;
  country: string;
  status: string;
  offers: number;
  gpus: number;
  availableGpus: number;
  uptimePct: number;
  earningsPaise: number;
  createdAt: string;
};

/**
 * Providers with the capacity and earnings each one accounts for.
 *
 * Earnings are derived from instance accrual x the offer's payout_rate: there
 * is no payouts ledger yet, so this is what is owed, not what has been paid.
 */
export async function listProviders(
  supabase: PermissionCapableClient,
  userId: string,
): Promise<AdminProviderRow[]> {
  await assertPermission(supabase, userId, "providers.read");

  const [{ data: providers }, { data: offers }, { data: instances }] =
    await Promise.all([
      supabaseAdmin
        .from("providers")
        .select("*")
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("provider_offers")
        .select(
          "id,provider_id,total_units,available_units,active,payout_rate",
        ),
      supabaseAdmin.from("instances").select("offer_id,accrued_paise"),
    ]);

  const payoutByOffer = new Map(
    (offers ?? []).map((o) => [o.id, Number(o.payout_rate ?? 0.82)]),
  );
  const providerByOffer = new Map(
    (offers ?? []).map((o) => [o.id, o.provider_id]),
  );

  const earnings = new Map<string, number>();
  for (const i of instances ?? []) {
    if (!i.offer_id) continue;
    const providerId = providerByOffer.get(i.offer_id);
    if (!providerId) continue;
    const share =
      (i.accrued_paise ?? 0) * (payoutByOffer.get(i.offer_id) ?? 0.82);
    earnings.set(providerId, (earnings.get(providerId) ?? 0) + share);
  }

  return (providers ?? []).map((p) => {
    const own = (offers ?? []).filter((o) => o.provider_id === p.id);
    const live = own.filter((o) => o.active);
    return {
      id: p.id,
      companyName: p.company_name,
      region: p.region,
      country: p.country,
      status: p.verification_status,
      offers: own.length,
      gpus: live.reduce((n, o) => n + o.total_units, 0),
      availableGpus: live.reduce((n, o) => n + o.available_units, 0),
      uptimePct: Number(p.uptime_pct ?? 0),
      earningsPaise: Math.round(earnings.get(p.id) ?? 0),
      createdAt: p.created_at,
    };
  });
}

// ------------------------------------------------------------------ billing

export type AdminBilling = {
  grossPaise: number;
  commissionPaise: number;
  payablePaise: number;
  creditsIssuedPaise: number;
  outstandingInvoices: number;
  invoices: {
    id: string;
    userId: string;
    userEmail: string;
    periodStart: string;
    computePaise: number;
    storagePaise: number;
    taxPaise: number;
    totalPaise: number;
    status: string;
  }[];
};

export async function billingSummary(
  supabase: PermissionCapableClient,
  userId: string,
  range: RangeKey,
): Promise<AdminBilling> {
  await assertPermission(supabase, userId, "billing.read");

  const since = rangeStart(range);
  const [
    { data: invoices },
    { data: transactions },
    { data: offers },
    { data: instances },
  ] = await Promise.all([
    supabaseAdmin
      .from("invoices")
      .select("*")
      .gte("period_start", since.slice(0, 10))
      .order("period_start", { ascending: false })
      .limit(200),
    supabaseAdmin
      .from("wallet_transactions")
      .select("kind,amount_paise,created_at")
      .gte("created_at", since),
    supabaseAdmin.from("provider_offers").select("payout_rate,active"),
    supabaseAdmin
      .from("instances")
      .select("accrued_paise,created_at")
      .gte("created_at", since),
  ]);

  const live = (offers ?? []).filter((o) => o.active);
  const avgPayoutRate = live.length
    ? live.reduce((n, o) => n + Number(o.payout_rate ?? 0.82), 0) / live.length
    : 0.82;

  const grossPaise = (instances ?? []).reduce(
    (n, i) => n + (i.accrued_paise ?? 0),
    0,
  );
  const payablePaise = Math.round(grossPaise * avgPayoutRate);

  const emails = await lookupEmails([
    ...new Set((invoices ?? []).map((i) => i.user_id)),
  ]);

  return {
    grossPaise,
    commissionPaise: grossPaise - payablePaise,
    payablePaise,
    creditsIssuedPaise: (transactions ?? [])
      .filter((t) => t.kind === "credit")
      .reduce((n, t) => n + t.amount_paise, 0),
    outstandingInvoices: (invoices ?? []).filter((i) => i.status !== "paid")
      .length,
    invoices: (invoices ?? []).map((i) => ({
      id: i.id,
      userId: i.user_id,
      userEmail: emails.get(i.user_id) ?? "unknown",
      periodStart: i.period_start,
      computePaise: i.compute_paise,
      storagePaise: i.storage_paise,
      taxPaise: i.gst_paise,
      totalPaise: i.total_paise,
      status: i.status,
    })),
  };
}
