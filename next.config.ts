import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
  },
  async redirects() {
    return [
      {
        source: "/verification",
        destination: "/research#verification",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
