import type { Metadata } from "next";
import { InstanceDetailClient } from "./instance-detail-client";

export const metadata: Metadata = {
  title: "Instance detail — RentGPU.space",
  description:
    "Connection details, spend and lifecycle controls for your GPU instance.",
  openGraph: {
    title: "Instance detail — RentGPU.space",
    description: "Control and monitor a single GPU instance.",
  },
};

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <InstanceDetailClient id={id} />;
}
