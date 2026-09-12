import type { Metadata } from "next";
import { AdminSupportClient } from "./admin-support-client";

export const metadata: Metadata = {
  title: "Support queue — RentGPU ops",
};

export default function Page() {
  return <AdminSupportClient />;
}
