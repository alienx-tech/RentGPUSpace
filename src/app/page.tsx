import type { Metadata } from "next";
import { HomeClient } from "./home-client";

export const metadata: Metadata = {
  title: "RentGPU.space — Rent verified GPUs by the minute",
  description:
    "On-demand H100, A100, L40S and RTX 4090 servers billed per minute in INR. UPI payments, GST invoices, instant deployment from India and Singapore.",
  openGraph: {
    title: "RentGPU.space — Rent verified GPUs by the minute",
    description:
      "Verified GPU inventory billed per minute in rupees. GPU cloud by ChaiMind.",
  },
};

export default function Page() {
  return <HomeClient />;
}
