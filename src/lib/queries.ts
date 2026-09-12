import { queryOptions } from "@tanstack/react-query";
import { isSupabaseConfigured, supabase } from "@/integrations/supabase/client";

const publicQueryEnabled = isSupabaseConfigured;

export const gpuTypesQuery = queryOptions({
  queryKey: ["gpu_types"],
  enabled: publicQueryEnabled,
  queryFn: async () => {
    const { data, error } = await supabase
      .from("gpu_types")
      .select("*")
      .order("sort_order");
    if (error) throw new Error(error.message);
    return data;
  },
});

export const templatesQuery = queryOptions({
  queryKey: ["templates"],
  enabled: publicQueryEnabled,
  queryFn: async () => {
    const { data, error } = await supabase
      .from("templates")
      .select("*")
      .order("sort_order");
    if (error) throw new Error(error.message);
    return data;
  },
});

export const offersQuery = queryOptions({
  queryKey: ["offers"],
  enabled: publicQueryEnabled,
  queryFn: async () => {
    const { data, error } = await supabase
      .from("provider_offers")
      .select("*, gpu_types(*), providers(*)")
      .eq("active", true)
      .order("price_inr_per_min_paise");
    if (error) throw new Error(error.message);
    return data;
  },
});

export function offerQuery(id: string) {
  return queryOptions({
    queryKey: ["offer", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("provider_offers")
        .select("*, gpu_types(*), providers(*)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },
  });
}

export const walletQuery = queryOptions({
  queryKey: ["wallet"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("wallets")
      .select("*")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  },
});

export const transactionsQuery = queryOptions({
  queryKey: ["wallet_transactions"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("wallet_transactions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data;
  },
});

export const instancesQuery = queryOptions({
  queryKey: ["instances"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("instances")
      .select(
        "*, templates(name,slug), provider_offers(*, gpu_types(*), providers(company_name,region))",
      )
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  },
  refetchInterval: 15000,
});

export function instanceQuery(id: string) {
  return queryOptions({
    queryKey: ["instance", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("instances")
        .select(
          "*, templates(name,slug), provider_offers(*, gpu_types(*), providers(company_name,region))",
        )
        .eq("id", id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },
    refetchInterval: 15000,
  });
}

export function instanceEventsQuery(id: string) {
  return queryOptions({
    queryKey: ["instance_events", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("instance_events")
        .select("*")
        .eq("instance_id", id)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data;
    },
  });
}

export const volumesQuery = queryOptions({
  queryKey: ["volumes"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("volumes")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  },
});

export const ticketsQuery = queryOptions({
  queryKey: ["support_tickets"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("support_tickets")
      .select("*, ticket_messages(*)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  },
});

export const invoicesQuery = queryOptions({
  queryKey: ["invoices"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("invoices")
      .select("*")
      .order("period_start", { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  },
});

export const myProvidersQuery = queryOptions({
  queryKey: ["my_providers"],
  queryFn: async () => {
    const { data: session } = await supabase.auth.getUser();
    const uid = session.user?.id;
    if (!uid) return [];
    const { data, error } = await supabase
      .from("providers")
      .select("*, provider_offers(*, gpu_types(*))")
      .eq("owner_id", uid);
    if (error) throw new Error(error.message);
    return data;
  },
});

export const oneClickTemplatesQuery = queryOptions({
  queryKey: ["templates", "one_click"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("templates")
      .select("*")
      .eq("one_click", true)
      .order("sort_order");
    if (error) throw new Error(error.message);
    return data;
  },
});

export const publicProvidersQuery = queryOptions({
  queryKey: ["public_providers"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("providers")
      .select(
        "*, provider_offers(id,available_units,total_units,price_inr_per_min_paise,active,gpu_types(model,vram_gb,tier)), provider_verification_events(stage,status,notes,created_at)",
      )
      .eq("verification_status", "verified")
      .order("uptime_pct", { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  },
});

export const providerReviewQueueQuery = queryOptions({
  queryKey: ["provider_review_queue"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("providers")
      .select(
        "*, provider_verification_events(id,stage,status,notes,created_at)",
      )
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  },
});

export const myRolesQuery = queryOptions({
  queryKey: ["my_roles"],
  queryFn: async () => {
    const { data, error } = await supabase.from("user_roles").select("role");
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => r.role);
  },
});
