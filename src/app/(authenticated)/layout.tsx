import { redirect } from "next/navigation";
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
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) redirect("/auth");

  return <>{children}</>;
}
