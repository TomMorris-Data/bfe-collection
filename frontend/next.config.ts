import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        // Worker runs on :8787 locally (wrangler dev), deployed worker URL in prod
        destination: `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787"}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
