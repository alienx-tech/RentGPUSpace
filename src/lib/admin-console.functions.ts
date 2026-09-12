"use server";

import { headers } from "next/headers";
import { z } from "zod";

import {
  adjustWalletCredit,
  billingSummary,
  listAuditLog,
  listInstances,
  listInventory,
  listMyPermissions,
  listProviders,
  listUsers,
  platformOverview,
  setOfferActive,
  setOfferPrice,
  terminateInstanceAsAdmin,
} from "./admin-console.server";
import { requireAuth } from "@/integrations/supabase/require-auth";

const RANGE = z.enum(["24h", "7d", "30d", "90d"]);

export async function adminMyPermissions() {
  const { userId } = await requireAuth();
  return listMyPermissions(userId);
}

export async function adminOverview(input: unknown) {
  const data = z.object({ range: RANGE }).parse(input);
  const { supabase, userId } = await requireAuth();
  return platformOverview(supabase, userId, data.range);
}

export async function adminUsers(input: unknown) {
  const data = z
    .object({ search: z.string().max(120).default("") })
    .parse(input);
  const { supabase, userId } = await requireAuth();
  return listUsers(supabase, userId, data.search);
}

export async function adminInventory() {
  const { supabase, userId } = await requireAuth();
  return listInventory(supabase, userId);
}

export async function adminInstances(input: unknown) {
  const data = z
    .object({ status: z.string().max(24).default("all") })
    .parse(input);
  const { supabase, userId } = await requireAuth();
  return listInstances(supabase, userId, data.status);
}

export async function adminAuditLog() {
  const { supabase, userId } = await requireAuth();
  return listAuditLog(supabase, userId);
}

// -------------------------------------------------------------- mutations
// Each writes an audit_logs row before returning; see audit.server.ts.

export async function adminSetOfferActive(input: unknown) {
  const data = z
    .object({ offerId: z.string().uuid(), active: z.boolean() })
    .parse(input);
  const { supabase, userId } = await requireAuth();
  return setOfferActive(supabase, userId, data, { headers: await headers() });
}

export async function adminSetOfferPrice(input: unknown) {
  const data = z
    .object({
      offerId: z.string().uuid(),
      pricePaisePerMin: z.number().int().min(1).max(1_000_000),
    })
    .parse(input);
  const { supabase, userId } = await requireAuth();
  return setOfferPrice(supabase, userId, data, { headers: await headers() });
}

export async function adminTerminateInstance(input: unknown) {
  const data = z
    .object({
      instanceId: z.string().uuid(),
      reason: z.string().min(3).max(500),
    })
    .parse(input);
  const { supabase, userId } = await requireAuth();
  return terminateInstanceAsAdmin(supabase, userId, data, {
    headers: await headers(),
  });
}

export async function adminAdjustCredit(input: unknown) {
  const data = z
    .object({
      userId: z.string().uuid(),
      // Signed: negative removes credit. Capped so a slipped digit cannot
      // move a fortune in one call.
      amountPaise: z.number().int().min(-10_000_000).max(10_000_000),
      reason: z.string().min(3).max(500),
    })
    .parse(input);
  const { supabase, userId } = await requireAuth();
  return adjustWalletCredit(supabase, userId, data, {
    headers: await headers(),
  });
}

export async function adminProviders() {
  const { supabase, userId } = await requireAuth();
  return listProviders(supabase, userId);
}

export async function adminBilling(input: unknown) {
  const data = z.object({ range: RANGE }).parse(input);
  const { supabase, userId } = await requireAuth();
  return billingSummary(supabase, userId, data.range);
}
