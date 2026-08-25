import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site-config";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteConfig.url.replace(/\/$/, "");
  const paths = [
    "/", "/en", "/featured-stocks", "/en/featured-stocks",
    "/verification", "/en/verification", "/pricing", "/en/pricing",
    "/guide", "/en/guide", "/methodology", "/en/methodology",
    "/support", "/en/support", "/privacy", "/en/privacy", "/terms", "/en/terms",
  ];
  return paths.map((pathname) => ({
    url: `${base}${pathname}`,
    lastModified: new Date(),
    changeFrequency: pathname.includes("verification") ? "daily" : "weekly",
    priority: pathname === "/" || pathname === "/en" ? 1 : 0.7,
  }));
}
