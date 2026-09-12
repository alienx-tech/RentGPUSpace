import type { Metadata } from "next";
import { GpusClient } from "./gpus-client";

export const metadata: Metadata = {
  title: "GPU’S — live availability | RentGPU.space",
  description:
    "Browse live GPU availability by model, region and price. Deploy an H100, A100, L40S or RTX 4090 instance in under a minute.",
  openGraph: {
    title: "GPU’S — live availability",
    description: "Filter verified GPU offers by model, region and price.",
  },
};

export default function Page() {
  return <GpusClient />;
}
