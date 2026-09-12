import type { Metadata } from "next";
import { WalletClient } from "./wallet-client";

export const metadata: Metadata = {
  title: "Wallet, UPI top-ups & GST invoices — RentGPU.space",
  description:
    "Add GPU credit over UPI, net banking or NEFT and download GST-ready monthly invoices as PDF or CSV.",
  openGraph: {
    title: "Wallet & GST invoices — RentGPU.space",
    description:
      "Prepaid GPU credit in rupees with UPI top-ups and per-minute metered invoices.",
    type: "website",
  },
  twitter: {
    card: "summary",
  },
};

export default function Page() {
  return <WalletClient />;
}
