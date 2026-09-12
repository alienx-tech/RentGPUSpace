import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type {
  ExtraClient,
  JsonValue,
} from "@/integrations/supabase/types.extra";
import { requestIdOf, type HeaderSource } from "./observability";

// audit_logs postdates the generated types.ts — see types.extra.ts.
const extraDb = supabaseAdmin as unknown as ExtraClient;

/**
 * Records a privileged administrative action.
 *
 * Called by every console mutation before it returns. Writes go through the
 * service role because audit_logs grants authenticated SELECT only — the table
 * is append-only by construction, so an admin cannot erase their own trail.
 */
export type AuditEntry = {
  actorId: string;
  actorEmail?: string;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  previous?: JsonValue;
  next?: JsonValue;
  metadata?: Record<string, JsonValue>;
};

export async function audit(
  entry: AuditEntry,
  request?: HeaderSource,
): Promise<void> {
  const metadata: Record<string, JsonValue> = { ...entry.metadata };
  if (request) metadata["requestId"] = requestIdOf(request);

  const { error } = await extraDb.from("audit_logs").insert({
    actor_id: entry.actorId,
    actor_email: entry.actorEmail ?? "",
    action: entry.action,
    resource_type: entry.resourceType,
    resource_id: entry.resourceId ?? null,
    previous: entry.previous ?? null,
    next: entry.next ?? null,
    metadata,
    ip: request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    user_agent: request?.headers.get("user-agent") ?? null,
  });

  // A failed audit write must not silently pass: the action it describes has
  // already happened, so surface it loudly rather than losing the record.
  if (error) {
    console.error(
      new Error(
        `Audit write failed for ${entry.action} on ${entry.resourceType}`,
        {
          cause: new Error(error.message),
        },
      ),
    );
  }
}
