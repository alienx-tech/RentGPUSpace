import type { Metadata } from "next";
import { ApiKeysClient } from "./api-keys-client";

export const metadata: Metadata = {
  title: "API keys · RentGPU.space console",
  description:
    "Create and revoke RentGPU.space API keys to rent, start, stop and meter GPU instances programmatically.",
  openGraph: {
    title: "API keys · RentGPU.space console",
    description:
      "Programmatic access to GPU provisioning, lifecycle control and per-minute billing.",
    type: "website",
  },
  twitter: {
    card: "summary",
  },
};

export default function Page() {
  return <ApiKeysClient />;
}
