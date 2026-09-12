import { z } from "zod";
import {
  authenticateRequest,
  corsPreflight,
  failure,
  json,
} from "@/lib/api-auth.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { startInstance } from "@/lib/rentgpu.server";

const createSchema = z.object({
  offer_id: z.string().uuid(),
  name: z.string().min(2).max(60),
  template_id: z.string().uuid().nullable().optional(),
  storage_gb: z.number().int().min(20).max(2000).default(50),
  spend_cap_paise: z.number().int().min(0).nullable().optional(),
  auto_shutdown_minutes: z
    .number()
    .int()
    .min(5)
    .max(10080)
    .nullable()
    .optional(),
});

export async function OPTIONS() {
  return corsPreflight();
}

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth.ok) return auth.response;
  try {
    const { data, error } = await supabaseAdmin
      .from("instances")
      .select(
        "id,name,status,price_inr_per_min_paise,storage_gb,accrued_paise,billed_minutes,spend_cap_paise,auto_shutdown_minutes,started_at,stopped_at,created_at",
      )
      .eq("user_id", auth.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return json({ instances: data ?? [] });
  } catch (err) {
    return failure(err, request);
  }
}

export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth.ok) return auth.response;
  try {
    const body = createSchema.parse(await request.json());
    const created = await startInstance(auth.userId, {
      offerId: body.offer_id,
      name: body.name,
      templateId: body.template_id ?? null,
      storageGb: body.storage_gb,
      spendCapPaise: body.spend_cap_paise ?? null,
      autoShutdownMinutes: body.auto_shutdown_minutes ?? null,
    });
    const { data } = await supabaseAdmin
      .from("instances")
      .select(
        "id,name,status,price_inr_per_min_paise,storage_gb,ssh_host,ssh_port,public_ip,jupyter_token,started_at",
      )
      .eq("id", created.id)
      .single();
    return json({ instance: data }, 201);
  } catch (err) {
    return failure(err, request);
  }
}
