import type { Metadata } from "next";
import { AdminTeamClient } from "./admin-team-client";

export const metadata: Metadata = {
  title: "Admin & roles — RentGPU ops",
};

export default function Page() {
  return <AdminTeamClient />;
}
