import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hide the floating Next.js Dev Tools badge so it does not sit on top of charts.
  devIndicators: false,
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
