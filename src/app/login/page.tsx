import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthClient } from "@/app/auth/auth-client";

export const metadata: Metadata = {
  title: "Log in — RentGPU.space",
  description: "Log in to deploy GPU instances and manage your RentGPU wallet.",
  openGraph: {
    title: "Log in — RentGPU.space",
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
