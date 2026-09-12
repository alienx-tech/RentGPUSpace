"use server";

import { z } from "zod";
import { requireAuth } from "@/integrations/supabase/require-auth";
import {
  listSupportQueue,
  replyToTicket,
  setTicketStatus,
} from "./admin.server";
import { TICKET_STATUSES } from "./support";

export async function adminSupportQueue() {
  const { supabase, userId } = await requireAuth();
  return listSupportQueue(supabase, userId);
}

export async function adminReplyTicket(input: unknown) {
  const data = z
    .object({
      ticketId: z.string().uuid(),
      body: z.string().min(2).max(4000),
    })
    .parse(input);
  const { supabase, userId } = await requireAuth();
  return replyToTicket(supabase, userId, data);
}

export async function adminSetTicketStatus(input: unknown) {
  const data = z
    .object({
      ticketId: z.string().uuid(),
      status: z.enum(TICKET_STATUSES),
    })
    .parse(input);
  const { supabase, userId } = await requireAuth();
  return setTicketStatus(supabase, userId, data);
}
