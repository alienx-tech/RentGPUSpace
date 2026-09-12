import type { Metadata } from "next";
import { AdminProvidersClient } from "./admin-providers-client";

export const metadata: Metadata = {
  title: "Providers — RentGPU ops",
};

export default function Page() {
  return <AdminProvidersClient />;
}
