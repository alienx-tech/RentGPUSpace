import type { Metadata } from "next";
import { AdminGpusClient } from "./admin-gpus-client";

export const metadata: Metadata = {
  title: "GPU inventory — RentGPU ops",
};

export default function Page() {
  return <AdminGpusClient />;
}
