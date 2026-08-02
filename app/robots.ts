import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site-config";
export default function robots(): MetadataRoute.Robots {
  const base = siteConfig.url.replace(/\/$/, "");
  return { rules: { userAgent: "*", allow: ["/", "/verification", "/methodology", "/support", "/pricing", "/featured-stocks", "/login", "/register", "/privacy", "/terms"], disallow: ["/research", "/research/", "/timeline", "/markets/", "/forecasts/", "/stocks", "/member/", "/verification/long-term", "/verification/learning", "/admin", "/admin/", "/api/"] }, sitemap: `${base}/sitemap.xml` };
}
