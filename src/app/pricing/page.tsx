import type { Metadata } from "next";
import { PricingClient } from "./pricing-client";

export const metadata: Metadata = {
  title: "GPU pricing in INR — RentGPU.space",
  description:
    "Per-minute GPU rental rates in rupees: H200, H100, A100, L40S, RTX 4090 and more. No egress fees, GST invoiced separately.",
  openGraph: {
    title: "GPU pricing in INR — RentGPU.space",
    description: "Per-minute GPU rental rates in rupees. No hidden fees.",
  },
};

export default function Page() {
  return <PricingClient />;
}
