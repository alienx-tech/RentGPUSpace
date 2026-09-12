/**
 * Support-ticket domain constants, mirroring the support_tickets.status CHECK
 * constraint. Client-safe: imported by both the admin UI and server validation.
 */
export const TICKET_STATUSES = [
  "open",
  "pending",
  "resolved",
  "closed",
] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];
