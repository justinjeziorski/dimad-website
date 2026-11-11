import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/dashboard", destination: "/dashboard/index.html" },
        { source: "/dashboard/", destination: "/dashboard/index.html" }
      ],
      afterFiles: [
        { source: "/", destination: "/index.html" }
      ]
    };
  }
};

export default nextConfig;
