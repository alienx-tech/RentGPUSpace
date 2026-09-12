import type { Metadata } from "next";
import { AdminHealthClient } from "./admin-health-client";

export const metadata: Metadata = {
  title: "Platform health — RentGPU ops",
};

export default function Page() {
  return <AdminHealthClient />;
}
