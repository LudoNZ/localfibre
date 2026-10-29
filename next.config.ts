import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  // Admin-only info sheets are read from disk by /api/info-sheets
  outputFileTracingIncludes: {
    "/api/info-sheets/[file]": ["./print/*.pdf", "./print/*.svg"],
  },
};

export default nextConfig;
