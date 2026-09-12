import type { Metadata } from "next";
import { LaunchClient } from "./launch-client";

export const metadata: Metadata = {
  title: "Templates — RentGPU.space console",
  description:
    "Deploy Llama 3.1, Qwen2.5, Whisper, ComfyUI or vLLM on a GPU, billed per minute.",
  openGraph: {
    title: "Templates — RentGPU.space",
    description:
      "Pick a model; we pick the cheapest GPU that meets its VRAM floor.",
    type: "website",
  },
  twitter: {
    card: "summary",
  },
};

export default function Page() {
  return <LaunchClient />;
}
