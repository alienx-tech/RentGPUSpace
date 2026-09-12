import type { Metadata } from "next";
import { AdminDeploymentsClient } from "./admin-deployments-client";

export const metadata: Metadata = {
  title: "Deployments — RentGPU ops",
};

export default function Page() {
  return <AdminDeploymentsClient />;
}
