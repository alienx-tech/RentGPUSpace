"use server";

import { z } from "zod";
import { requireAuth } from "@/integrations/supabase/require-auth";
import { createApiKeyFor, revokeApiKeyFor } from "./api-keys.server";

export async function createApiKey(input: unknown) {
  const data = z.object({ name: z.string().min(2).max(60) }).parse(input);
  const { userId } = await requireAuth();
  return createApiKeyFor(userId, data.name);
}

export async function revokeApiKey(input: unknown) {
  const data = z.object({ id: z.string().uuid() }).parse(input);
  const { userId } = await requireAuth();
  return revokeApiKeyFor(userId, data.id);
}
