import {
  authenticateRequest,
  corsPreflight,
  failure,
  json,
} from "@/lib/api-auth.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getWallet, meterUser } from "@/lib/rentgpu.server";

export async function OPTIONS() {
  return corsPreflight();
}

// GET returns the current billing snapshot without mutating anything.
export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth.ok) return auth.response;
  try {
    const wallet = await getWallet(auth.userId);
    const { data: running } = await supabaseAdmin
      .from("instances")
      .select(
        "id,name,price_inr_per_min_paise,accrued_paise,billed_minutes,spend_cap_paise,started_at",
      )
      .eq("user_id", auth.userId)
      .eq("status", "running");
    const burn = (running ?? []).reduce(
      (sum, r) => sum + r.price_inr_per_min_paise,
      0,
    );
    return json({
      balance_paise: wallet.balance_paise,
      burn_paise_per_min: burn,
      runway_minutes: burn > 0 ? Math.floor(wallet.balance_paise / burn) : null,
      running: running ?? [],
    });
  } catch (err) {
    return failure(err, request);
  }
}

// POST forces a metering tick: charges elapsed minutes, applies caps and auto-shutdown.
export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth.ok) return auth.response;
  try {
    return json(await meterUser(auth.userId));
  } catch (err) {
    return failure(err, request);
  }
}
