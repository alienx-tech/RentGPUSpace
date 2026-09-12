import type { Metadata } from "next";
import { SupportClient } from "./support-client";

export const metadata: Metadata = {
  title: "Support — RentGPU.space",
  description:
    "Raise a support ticket with the RentGPU engineering team, IST hours.",
  openGraph: {
    title: "Support — RentGPU.space",
    description: "Get help with instances, billing and capacity.",
  },
};

export default function Page() {
  return <SupportClient />;
}
