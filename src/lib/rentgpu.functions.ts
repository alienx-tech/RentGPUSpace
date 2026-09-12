"use server";

import { z } from "zod";
import { requireAuth } from "@/integrations/supabase/require-auth";
import {
  applyAsProvider,
  meterUser,
  oneClickLaunch,
  resumeInstance,
  startInstance,
  stopInstance,
  topUpWallet,
} from "./rentgpu.server";
import { rebuildInvoices } from "./billing.server";
import {
  decideProvider,
  recordVerificationStage,
  requestVerification,
} from "./providers.server";

export async function deployInstance(input: unknown) {
  const data = z
    .object({
      offerId: z.string().uuid(),
      templateId: z.string().uuid().nullable().optional(),
      name: z.string().min(2).max(60),
      storageGb: z.number().int().min(20).max(2000),
      spendCapPaise: z.number().int().min(0).nullable().optional(),
      autoShutdownMinutes: z
        .number()
        .int()
        .min(5)
        .max(10080)
        .nullable()
        .optional(),
    })
    .parse(input);
  const { userId } = await requireAuth();
  return startInstance(userId, data);
}

export async function haltInstance(input: unknown) {
  const data = z
    .object({ instanceId: z.string().uuid(), terminate: z.boolean() })
    .parse(input);
  const { userId } = await requireAuth();
  return stopInstance(userId, data.instanceId, data.terminate);
}

export async function restartInstance(input: unknown) {
  const data = z.object({ instanceId: z.string().uuid() }).parse(input);
  const { userId } = await requireAuth();
  return resumeInstance(userId, data.instanceId);
}

export async function runMetering() {
  const { userId } = await requireAuth();
  return meterUser(userId);
}

export async function addCredit(input: unknown) {
  const data = z
    .object({
      amountPaise: z.number().int().min(10000).max(50000000),
      method: z.enum([
        "upi_intent",
        "upi_id",
        "upi_qr",
        "netbanking",
        "wallet",
        "card",
        "rtgs",
      ]),
      detail: z.string().max(80).default(""),
    })
    .parse(input);
  const { userId } = await requireAuth();
  return topUpWallet(userId, data.amountPaise, data.method, data.detail);
}

export async function launchTemplate(input: unknown) {
  const data = z
    .object({
      slug: z.string().min(2).max(60),
      name: z.string().max(60).default(""),
    })
    .parse(input);
  const { userId } = await requireAuth();
  return oneClickLaunch(userId, data.slug, data.name);
}

export async function refreshInvoices() {
  const { userId } = await requireAuth();
  return rebuildInvoices(userId);
}

export async function submitForVerification(input: unknown) {
  const data = z.object({ providerId: z.string().uuid() }).parse(input);
  const { userId } = await requireAuth();
  return requestVerification(userId, data.providerId);
}

export async function reviewProviderStage(input: unknown) {
  const data = z
    .object({
      providerId: z.string().uuid(),
      stage: z.string().min(2).max(60),
      status: z.enum(["passed", "failed", "pending"]),
      notes: z.string().max(500).default(""),
    })
    .parse(input);
  const { supabase, userId } = await requireAuth();
  return recordVerificationStage(supabase, userId, data);
}

export async function decideProviderApplication(input: unknown) {
  const data = z
    .object({
      providerId: z.string().uuid(),
      decision: z.enum(["verified", "rejected", "suspended"]),
      notes: z.string().max(500).default(""),
      scorecard: z
        .object({
          benchmarkScore: z.number().int().min(0).max(10000),
          uptimePct: z.number().min(0).max(100),
          storageReadMbps: z.number().int().min(0).max(100000),
          storageWriteMbps: z.number().int().min(0).max(100000),
          avgProvisionSeconds: z.number().int().min(1).max(3600),
        })
        .optional(),
    })
    .parse(input);
  const { supabase, userId } = await requireAuth();
  return decideProvider(supabase, userId, data);
}

export async function submitProviderApplication(input: unknown) {
  const data = z
    .object({
      companyName: z.string().min(2).max(80),
      region: z.string().min(2).max(60),
      country: z.string().min(2).max(2),
      datacentreTier: z.string().min(2).max(20),
      networkGbps: z.number().int().min(1).max(400),
      contactEmail: z.string().email(),
      notes: z.string().max(1000).default(""),
    })
    .parse(input);
  const { userId } = await requireAuth();
  return applyAsProvider(userId, data);
}
