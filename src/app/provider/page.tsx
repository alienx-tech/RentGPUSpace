import type { Metadata } from "next";
import { ProviderClient } from "./provider-client";

export const metadata: Metadata = {
  title: "List your GPUs — provider partners | RentGPU.space",
  description:
    "Monetise idle GPU capacity. RentGPU handles provisioning, metering, billing, payouts and support. Providers keep 82% of revenue.",
  openGraph: {
    title: "Become a RentGPU provider",
    description: "Turn idle data-centre GPUs into metered revenue.",
  },
};

export default function Page() {
  return <ProviderClient />;
}
