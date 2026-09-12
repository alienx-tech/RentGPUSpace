import {
  corsPreflight,
  enforcePublicRateLimit,
  failure,
  json,
} from "@/lib/api-auth.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function OPTIONS() {
  return corsPreflight();
}

export async function GET(request: Request) {
  const throttled = enforcePublicRateLimit(request);
  if (throttled) return throttled;
  try {
    const { data, error } = await supabaseAdmin
      .from("provider_offers")
      .select(
        "id,available_units,total_units,price_inr_per_min_paise,storage_gb_included,gpu_types(model,vram_gb,tier),providers(company_name,region,country,datacentre_tier,uptime_pct)",
      )
      .eq("active", true)
      .order("price_inr_per_min_paise");
    if (error) throw new Error(error.message);

    return json({
      offers: (data ?? []).map((o) => ({
        offer_id: o.id,
        gpu: o.gpu_types?.model ?? null,
        vram_gb: o.gpu_types?.vram_gb ?? null,
        tier: o.gpu_types?.tier ?? null,
        provider: o.providers?.company_name ?? null,
        region: o.providers?.region ?? null,
        country: o.providers?.country ?? null,
        datacentre_tier: o.providers?.datacentre_tier ?? null,
        uptime_pct: o.providers?.uptime_pct ?? null,
        available_units: o.available_units,
        total_units: o.total_units,
        storage_gb_included: o.storage_gb_included,
        price_inr_per_min_paise: o.price_inr_per_min_paise,
        price_inr_per_hour: (o.price_inr_per_min_paise * 60) / 100,
      })),
    });
  } catch (err) {
    return failure(err, request);
  }
}
