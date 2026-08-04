import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site-config";
export default function robots(): MetadataRoute.Robots {
  const base = siteConfig.url.replace(/\/$/, "");
  return { rules: { userAgent: "*", allow: ["/", "/en", "/verification", "/en/verification", "/methodology", "/en/methodology", "/support", "/en/support", "/pricing", "/en/pricing", "/featured-stocks", "/en/featured-stocks", "/login", "/en/login", "/register", "/en/register", "/privacy", "/en/privacy", "/terms", "/en/terms"], disallow: ["/research", "/research/", "/en/research", "/en/research/", "/timeline", "/en/timeline", "/markets/", "/en/markets/", "/forecasts/", "/en/forecasts/", "/stocks", "/en/stocks", "/member/", "/en/member/", "/verification/long-term", "/en/verification/long-term", "/verification/learning", "/en/verification/learning", "/admin", "/admin/", "/api/"] }, sitemap: `${base}/sitemap.xml` };
}
