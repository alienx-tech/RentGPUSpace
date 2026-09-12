import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { generateKey, hashKey } from "./api-auth.server";

export async function createApiKeyFor(userId: string, name: string) {
  const { secret, prefix } = generateKey();
  const key_hash = await hashKey(secret);
  const { data, error } = await supabaseAdmin
    .from("api_keys")
    .insert({ user_id: userId, name, prefix, key_hash })
    .select("id,name,prefix,created_at")
    .single();
  if (error) throw new Error(error.message);
  return { ...data, secret };
}

export async function revokeApiKeyFor(userId: string, id: string) {
  const { error } = await supabaseAdmin
    .from("api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  return { ok: true };
}
