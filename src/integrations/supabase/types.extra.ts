/**
 * Hand-written types for the tables added after the generated types.ts was
 * last produced (audit logs, RBAC permissions, currency and tax).
 *
 * types.ts carries a "do not edit" banner and is regenerated from the live
 * schema, so these live beside it instead. When the generator is next run
 * against a database that has these migrations applied, delete this file and
 * the cast in admin-console.server.ts.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Permission } from "@/lib/permissions";

export type TaxType = "gst" | "vat" | "sales_tax" | "none";

/** What a jsonb column can hold. `unknown` is not serialisable across a server fn. */
export type JsonValue =
  string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export type AuditLogRow = {
  id: number;
  actor_id: string | null;
  actor_email: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  previous: JsonValue;
  next: JsonValue;
  metadata: Record<string, JsonValue>;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
};

export type RolePermissionRow = { role: string; permission: Permission };

export type CurrencyRow = {
  code: string;
  name: string;
  symbol: string;
  minor_unit: number;
  is_base: boolean;
  active: boolean;
  created_at: string;
};

export type TaxRuleRow = {
  id: string;
  country: string;
  region: string | null;
  tax_type: TaxType;
  name: string;
  rate: number;
  applies_to_business: boolean;
  effective_from: string;
  effective_to: string | null;
  created_at: string;
};

type Table<Row, Insert = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Partial<Insert>;
  Relationships: [];
};

export type ExtraDatabase = {
  public: {
    Tables: {
      audit_logs: Table<AuditLogRow, Omit<AuditLogRow, "id" | "created_at">>;
      role_permissions: Table<RolePermissionRow>;
      currencies: Table<CurrencyRow>;
      tax_rules: Table<TaxRuleRow>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: { tax_type: TaxType };
    CompositeTypes: Record<string, never>;
  };
};

export type ExtraClient = SupabaseClient<ExtraDatabase, "public">;
