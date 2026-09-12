import {
  authenticateRequest,
  corsPreflight,
  failure,
  json,
} from "@/lib/api-auth.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { stopInstance } from "@/lib/rentgpu.server";

export async function OPTIONS() {
  return corsPreflight();
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateRequest(request);
  if (!auth.ok) return auth.response;
  try {
    const { id } = await params;
    const { data, error } = await supabaseAdmin
      .from("instances")
      .select("*")
      .eq("id", id)
      .eq("user_id", auth.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data)
      return json({ error: "not_found", message: "Instance not found." }, 404);
    const { data: events } = await supabaseAdmin
      .from("instance_events")
      .select("event,detail,created_at")
      .eq("instance_id", id)
      .order("created_at", { ascending: false })
      .limit(20);
    return json({ instance: data, events: events ?? [] });
  } catch (err) {
    return failure(err, request);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateRequest(request);
  if (!auth.ok) return auth.response;
  try {
    const { id } = await params;
    await stopInstance(auth.userId, id, true);
    return json({ ok: true, status: "terminated" });
  } catch (err) {
    return failure(err, request);
  }
}
