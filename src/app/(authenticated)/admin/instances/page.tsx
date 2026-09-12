import type { Metadata } from "next";
import { AdminInstancesClient } from "./admin-instances-client";

export const metadata: Metadata = {
  title: "Instances — RentGPU ops",
};

export default function Page() {
  return <AdminInstancesClient />;
}
