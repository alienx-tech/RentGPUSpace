import type { Metadata } from "next";
import { Suspense } from "react";
import { WelcomeClient } from "./welcome-client";

export const metadata: Metadata = {
  title: "Welcome — RentGPU.space",
  description: "Your account is ready. Deploy your first GPU instance.",
};

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <WelcomeClient />
    </Suspense>
  );
}
