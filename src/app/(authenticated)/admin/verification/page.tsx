import type { Metadata } from "next";
import { AdminVerificationClient } from "./admin-verification-client";

export const metadata: Metadata = {
  title: "Provider verification — RentGPU ops",
};

export default function Page() {
  return <AdminVerificationClient />;
}
