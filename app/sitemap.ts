import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site-config";

/** Public sitemap only — no internal research / admin / member forecast URLs. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteConfig.url.replace(/\/$/, "");
  const paths = ["/", "/featured-stocks", "/verification", "/pricing", "/login", "/register", "/privacy", "/terms"];
  return paths.map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: path === "/" ? 1 : 0.7,
  }));
}
