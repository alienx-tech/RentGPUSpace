import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "RentGPU.space — GPU cloud by ChaiMind",
  description:
    "Rent verified GPUs by the minute. Transparent INR pricing, instant deployment.",
  authors: [{ name: "ChaiMind" }],
  icons: {
    icon: "/favicon.png",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "RentGPU.space — GPU cloud by ChaiMind",
    description:
      "Rent verified GPUs by the minute. Transparent INR pricing, instant deployment.",
    type: "website",
    images: ["https://rentgpu.space/og-image.png"],
  },
  twitter: {
    card: "summary_large_image",
    images: ["https://rentgpu.space/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600&display=swap"
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
