import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site-config";
export default function robots(): MetadataRoute.Robots {
  const base = siteConfig.url.replace(/\/$/, "");
  const publicAllow = ["/", "/en", "/verification", "/en/verification", "/methodology", "/en/methodology", "/support", "/en/support", "/pricing", "/en/pricing", "/featured-stocks", "/en/featured-stocks", "/login", "/en/login", "/register", "/en/register", "/privacy", "/en/privacy", "/terms", "/en/terms", "/llms.txt"];
  const privateDisallow = ["/research", "/research/", "/en/research", "/en/research/", "/timeline", "/en/timeline", "/markets/", "/en/markets/", "/forecasts/", "/en/forecasts/", "/stocks", "/en/stocks", "/member/", "/en/member/", "/member-preview", "/account", "/account/", "/en/account", "/en/account/", "/checkout", "/checkout/", "/verification/long-term", "/en/verification/long-term", "/verification/learning", "/en/verification/learning", "/admin", "/admin/", "/api/"];
  return {
    rules: [
      { userAgent: "*", allow: publicAllow, disallow: privateDisallow },
      { userAgent: "OAI-SearchBot", allow: publicAllow, disallow: privateDisallow },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
