import type { Metadata } from "next";
import { AdminPayoutsClient } from "./admin-payouts-client";

export const metadata: Metadata = {
  title: "Provider payouts — RentGPU ops",
};

export default function Page() {
  return <AdminPayoutsClient />;
}
