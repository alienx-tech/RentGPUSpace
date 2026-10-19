import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createSupabaseServerClient } from "@/integrations/supabase/server";

// Server-side now (Option A) instead of the old client-only `beforeLoad`
// check — no more flash-then-redirect. Postgres RLS and each Server
// Action's own auth check remain the actual security boundary either way;
// this is UX gating, not the enforcement point.
export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Every route under this layout is gated on the caller's session, so none
  // of them can be prerendered. Say so before touching Supabase: the client
  // throws on missing credentials, and that throw happens before the first
  // `cookies()` read that would otherwise signal Next to stop prerendering —
  // turning a build without runtime Supabase config into a prerender error
  // rather than the request-time render these pages always needed.
  await connection();

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) redirect("/auth");

  return <>{children}</>;
}
