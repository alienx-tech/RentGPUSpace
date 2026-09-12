import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthClient } from "./auth-client";

export const metadata: Metadata = {
  title: "Sign in — RentGPU.space",
  description:
    "Sign in to deploy GPU instances and manage your RentGPU wallet.",
  openGraph: {
    title: "Sign in — RentGPU.space",
    description: "Access your RentGPU console.",
  },
};

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <AuthClient />
    </Suspense>
  );
}
