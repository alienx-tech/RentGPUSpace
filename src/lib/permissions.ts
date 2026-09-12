/**
 * Mirror of the app_permission enum created in
 * supabase/migrations/20260823100200_rbac_permissions.sql.
 *
 * The database is the authority — RLS and every server function check
 * has_permission() there. This list exists so the console can decide which
 * navigation and controls to render, and so a typo becomes a type error.
 */
export const PERMISSIONS = [
  "admin.access",
  "users.read",
  "users.write",
  "users.credit",
  "gpus.read",
  "gpus.write",
  "nodes.read",
  "nodes.write",
  "providers.read",
  "providers.write",
  "providers.verify",
  "instances.read",
  "instances.write",
  "pricing.read",
  "pricing.write",
  "billing.read",
  "payouts.read",
  "payouts.write",
  "support.read",
  "support.write",
  "risk.read",
  "audit.read",
  "team.write",
  "settings.write",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const ADMIN_ROLES = [
  "super_admin",
  "operations_admin",
  "finance_admin",
  "provider_manager",
  "support_agent",
  "security_admin",
  "analyst",
] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];

export const ROLE_LABELS: Record<string, string> = {
  admin: "Admin (legacy)",
  super_admin: "Super Admin",
  operations_admin: "Operations Admin",
  finance_admin: "Finance Admin",
  provider_manager: "Provider Manager",
  support_agent: "Support Agent",
  security_admin: "Security Admin",
  analyst: "Read-only Analyst",
  provider: "Provider",
  user: "Customer",
};
