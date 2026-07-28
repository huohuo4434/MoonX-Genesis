import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
  },
  async redirects() {
    return [
      { source: "/member-preview", destination: "/", permanent: false },
      { source: "/forecasts", destination: "/member/tomorrow", permanent: false },
      { source: "/admin/plans", destination: "/admin", permanent: false },
      { source: "/account/membership", destination: "/account", permanent: false },
    ];
  },
};

export default nextConfig;
