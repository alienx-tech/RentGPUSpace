import type { Metadata } from "next";
import { AdminPricingClient } from "./admin-pricing-client";

export const metadata: Metadata = {
  title: "Pricing — RentGPU ops",
};

export default function Page() {
  return <AdminPricingClient />;
}
