import { PublicError } from "./errors";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { TicketStatus } from "./support";

/** Minimal shape of the request-scoped (RLS-bound) client used for role checks. */
export type AdminCapableClient = {
  rpc: (
    fn: "has_role",
    args: { _user_id: string; _role: "admin" },
  ) => PromiseLike<{ data: unknown }>;
};

/**
 * Verifies the caller holds the admin role using their own RLS-bound client,
 * so the check reads the same has_role() the policies use.
 */
export async function assertAdmin(
  supabase: AdminCapableClient,
  userId: string,
) {
  const { data } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (data !== true)
    throw new PublicError("Admin access required.", {
      status: 403,
      code: "forbidden",
    });
}

export type AdminTicket = {
  id: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  created_at: string;
  updated_at: string;
  customer: { id: string; email: string; displayName: string; orgName: string };
  messages: {
    id: string;
    body: string;
    author_role: string;
    created_at: string;
  }[];
};

/**
 * Every ticket across tenants, with the customer identity attached.
 *
 * Runs through the service role because the "own tickets" policy lets an admin
 * read other tenants' tickets but never their profiles or auth records.
 */
export async function listSupportQueue(
  supabase: AdminCapableClient,
  userId: string,
  limit = 50,
): Promise<AdminTicket[]> {
  await assertAdmin(supabase, userId);

  const { data: tickets, error } = await supabaseAdmin
    .from("support_tickets")
    .select("*, ticket_messages(id,body,author_role,created_at)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);

  const ids = [...new Set((tickets ?? []).map((t) => t.user_id))];
  if (!ids.length) return [];

  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("id,display_name,org_name")
    .in("id", ids);
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  const emails = new Map<string, string>();
  await Promise.all(
    ids.map(async (id) => {
      const { data } = await supabaseAdmin.auth.admin.getUserById(id);
      if (data.user?.email) emails.set(id, data.user.email);
    }),
  );

  return (tickets ?? []).map((t) => ({
    id: t.id,
    subject: t.subject,
    category: t.category,
    priority: t.priority,
    status: t.status,
    created_at: t.created_at,
    updated_at: t.updated_at,
    customer: {
      id: t.user_id,
      email: emails.get(t.user_id) ?? "unknown",
      displayName: profileById.get(t.user_id)?.display_name ?? "",
      orgName: profileById.get(t.user_id)?.org_name ?? "",
    },
    messages: [...(t.ticket_messages ?? [])].sort((a, b) =>
      a.created_at.localeCompare(b.created_at),
    ),
  }));
}

/**
 * Posts a staff reply on any tenant's ticket.
 *
 * The ticket_messages WITH CHECK requires both the author and the ticket owner
 * to be auth.uid(), so staff replies cannot go through the caller's client.
 */
export async function replyToTicket(
  supabase: AdminCapableClient,
  actorId: string,
  input: { ticketId: string; body: string },
) {
  await assertAdmin(supabase, actorId);

  const { error } = await supabaseAdmin.from("ticket_messages").insert({
    ticket_id: input.ticketId,
    user_id: actorId,
    author_role: "staff",
    body: input.body,
  });
  if (error) throw new Error(error.message);

  // Touch the ticket so the queue re-sorts on last activity.
  await supabaseAdmin
    .from("support_tickets")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", input.ticketId);

  return { ok: true };
}

/** Moves a ticket through open → pending → resolved → closed. */
export async function setTicketStatus(
  supabase: AdminCapableClient,
  actorId: string,
  input: { ticketId: string; status: TicketStatus },
) {
  await assertAdmin(supabase, actorId);

  const { error } = await supabaseAdmin
    .from("support_tickets")
    .update({ status: input.status })
    .eq("id", input.ticketId);
  if (error) throw new Error(error.message);

  return { ok: true, status: input.status };
}
