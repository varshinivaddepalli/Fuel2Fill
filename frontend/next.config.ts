import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 828, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
  },
  async redirects() {
    return [
      {
        source: "/operations/stock",
        destination: "/stock",
        permanent: true,
      },
      {
        source: "/operations/purchases",
        destination: "/purchases",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
