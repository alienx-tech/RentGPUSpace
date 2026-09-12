import type { Metadata } from "next";
import { DashboardClient } from "./dashboard-client";

export const metadata: Metadata = {
  title: "Console overview — RentGPU.space",
  description: "Your running GPU instances, wallet balance and recent spend.",
  openGraph: {
    title: "Console overview — RentGPU.space",
    description: "Track running GPUs, balance and burn rate.",
  },
};

export default function Page() {
  return <DashboardClient />;
}
