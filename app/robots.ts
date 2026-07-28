import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: [
        "/",
        "/verification",
        "/pricing",
        "/member/tomorrow",
        "/member/weekly",
        "/member/stocks",
        "/account",
        "/login",
        "/privacy",
        "/terms",
      ],
      disallow: [
        "/research",
        "/research/",
        "/timeline",
        "/markets/",
        "/forecasts/",
        "/stocks",
        "/verification/long-term",
        "/verification/learning",
        "/admin",
        "/admin/",
        "/api/",
      ],
    },
    sitemap: "https://moon-x-genesis.vercel.app/sitemap.xml",
  };
}
