import type { Metadata } from "next";
import { AdminDashboardClient } from "./admin-dashboard-client";

export const metadata: Metadata = {
  title: "Operations dashboard — RentGPU.space",
};

export default function Page() {
  return <AdminDashboardClient />;
}
