import type { Metadata } from "next";
import { AdminBillingClient } from "./admin-billing-client";

export const metadata: Metadata = {
  title: "Billing — RentGPU ops",
};

export default function Page() {
  return <AdminBillingClient />;
}
