import { PublicError } from "./errors";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { assertAdmin, type AdminCapableClient } from "./admin.server";

export const VERIFICATION_STAGES = [
  {
    key: "kyc",
    label: "Company KYC",
    notes: "GST and incorporation documents verified.",
  },
  {
    key: "datacentre",
    label: "Datacentre audit",
    notes: "Power redundancy, cooling and physical access reviewed.",
  },
  {
    key: "benchmark",
    label: "Hardware benchmark",
    notes: "MLPerf-style throughput run on a sample node.",
  },
  {
    key: "network",
    label: "Network + storage test",
    notes: "Sustained bandwidth and NVMe throughput measured.",
  },
  {
    key: "burn_in",
    label: "Live burn-in",
    notes: "72-hour uptime burn-in completed before listing.",
  },
] as const;

export async function recordVerificationStage(
  supabase: AdminCapableClient,
  actorId: string,
  input: {
    providerId: string;
    stage: string;
    status: "passed" | "failed" | "pending";
    notes: string;
  },
) {
  await assertAdmin(supabase, actorId);
  const { error } = await supabaseAdmin
    .from("provider_verification_events")
    .insert({
      provider_id: input.providerId,
      stage: input.stage,
      status: input.status,
      notes: input.notes,
      actor_id: actorId,
    });
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function decideProvider(
  supabase: AdminCapableClient,
  actorId: string,
  input: {
    providerId: string;
    decision: "verified" | "rejected" | "suspended";
    notes: string;
    scorecard?:
      | undefined
      | {
          benchmarkScore: number;
          uptimePct: number;
          storageReadMbps: number;
          storageWriteMbps: number;
          avgProvisionSeconds: number;
        };
  },
) {
  await assertAdmin(supabase, actorId);
  const { error } = await supabaseAdmin
    .from("providers")
    .update({
      verification_status: input.decision,
      review_notes: input.notes,
      reviewed_by: actorId,
      verified_at:
        input.decision === "verified" ? new Date().toISOString() : null,
      ...(input.scorecard
        ? {
            benchmark_score: input.scorecard.benchmarkScore,
            uptime_pct: input.scorecard.uptimePct,
            storage_read_mbps: input.scorecard.storageReadMbps,
            storage_write_mbps: input.scorecard.storageWriteMbps,
            avg_provision_seconds: input.scorecard.avgProvisionSeconds,
          }
        : {}),
    })
    .eq("id", input.providerId);
  if (error) throw new Error(error.message);

  await supabaseAdmin.from("provider_verification_events").insert({
    provider_id: input.providerId,
    stage: "Decision",
    status: input.decision === "verified" ? "passed" : "failed",
    notes: input.notes || `Marked ${input.decision}.`,
    actor_id: actorId,
  });

  return { ok: true, status: input.decision };
}

/** Submits an owner's provider for review and opens the standard stage checklist. */
export async function requestVerification(userId: string, providerId: string) {
  const { data: provider, error } = await supabaseAdmin
    .from("providers")
    .select("id,owner_id,verification_status")
    .eq("id", providerId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!provider || provider.owner_id !== userId)
    throw new PublicError("Provider not found.", {
      status: 404,
      code: "not_found",
    });
  if (provider.verification_status === "verified")
    throw new PublicError("This provider is already verified.", {
      status: 409,
      code: "invalid_state",
    });

  await supabaseAdmin
    .from("providers")
    .update({ verification_status: "in_review" })
    .eq("id", providerId);

  const { data: existing } = await supabaseAdmin
    .from("provider_verification_events")
    .select("stage")
    .eq("provider_id", providerId);
  const seen = new Set((existing ?? []).map((e) => e.stage));
  const rows = VERIFICATION_STAGES.filter((s) => !seen.has(s.label)).map(
    (s) => ({
      provider_id: providerId,
      stage: s.label,
      status: "pending",
      notes: s.notes,
    }),
  );
  if (rows.length)
    await supabaseAdmin.from("provider_verification_events").insert(rows);

  return { ok: true };
}
