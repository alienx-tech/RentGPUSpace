import type { Metadata } from "next";
import { AdminAuditLogClient } from "./admin-audit-log-client";

export const metadata: Metadata = {
  title: "Audit logs — RentGPU ops",
};

export default function Page() {
  return <AdminAuditLogClient />;
}
