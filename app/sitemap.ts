import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site-config";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteConfig.url.replace(/\/$/, "");
  const paths = ["/", "/featured-stocks", "/verification", "/methodology", "/support", "/pricing", "/login", "/register", "/privacy", "/terms"];
  return paths.map((path) => ({ url: `${base}${path}`, lastModified: new Date(), changeFrequency: path === "/" ? "daily" as const : "weekly" as const, priority: path === "/" ? 1 : 0.7 }));
}
