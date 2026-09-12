import "server-only";
import { createSupabaseServerClient } from "./server";

/**
 * Server Action equivalent of the old `requireSupabaseAuth` TanStack
 * middleware — resolves the caller from the session cookie (see server.ts)
 * instead of a manually-attached Authorization header (Option A of the
 * Next.js migration plan). Throws if there's no valid session.
 */
export async function requireAuth() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) {
    throw new Error("Unauthorized");
  }
  return { supabase, userId: data.claims.sub as string, claims: data.claims };
}
