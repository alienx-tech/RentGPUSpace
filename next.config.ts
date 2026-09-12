import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Minimal, self-contained server.js output for the Docker runtime stage —
  // the direct structural analog of the old Nitro `.output/` build.
  output: "standalone",
};

export default nextConfig;
