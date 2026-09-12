import type { Metadata } from "next";
import { InstancesClient } from "./instances-client";

export const metadata: Metadata = {
  title: "Your GPU instances — RentGPU.space",
  description: "Manage, stop and terminate your running GPU instances.",
  openGraph: {
    title: "Your GPU instances — RentGPU.space",
    description: "Manage running GPU instances and spend.",
  },
};

export default function Page() {
  return <InstancesClient />;
}
