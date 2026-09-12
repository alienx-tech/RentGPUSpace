import type { Metadata } from "next";
import { VerificationClient } from "./verification-client";

export const metadata: Metadata = {
  title: "Provider verification queue — RentGPU.space",
  description:
    "Review supplier KYC, benchmarks and burn-in results before GPU capacity goes live.",
  openGraph: {
    title: "Provider verification queue — RentGPU.space",
    description: "Admin review of GPU supply verification stages.",
    type: "website",
  },
  twitter: {
    card: "summary",
  },
};

export default function Page() {
  return <VerificationClient />;
}
