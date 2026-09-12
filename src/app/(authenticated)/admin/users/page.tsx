import type { Metadata } from "next";
import { AdminUsersClient } from "./admin-users-client";

export const metadata: Metadata = {
  title: "Users — RentGPU ops",
};

export default function Page() {
  return <AdminUsersClient />;
}
