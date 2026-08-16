import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["jspdf", "canvg"],
  experimental: {
    workerThreads: true,
  },
};

export default nextConfig;
