import type { Metadata } from "next";
import { ProvidersClient } from "./providers-client";

export const metadata: Metadata = {
  title:
    "Verified GPU supply — provider reliability scorecards | RentGPU.space",
  description:
    "Every RentGPU supply source is audited: uptime, benchmark score, network throughput, NVMe read/write and provisioning time, published per provider.",
  openGraph: {
    title: "Provider reliability scorecards — RentGPU.space",
    description:
      "Uptime, benchmarks, network and storage metrics for each verified GPU supplier.",
    type: "website",
  },
  twitter: {
    card: "summary",
  },
};

export default function Page() {
  return <ProvidersClient />;
}
