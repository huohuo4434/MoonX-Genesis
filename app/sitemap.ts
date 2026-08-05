import type { MetadataRoute } from "next";
import { englishPath } from "@/lib/i18n/config";
import { siteConfig } from "@/lib/site-config";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteConfig.url.replace(/\/$/, "");
  const paths = [
    "/",
    "/guide",
    "/featured-stocks",
    "/verification",
    "/methodology",
    "/support",
    "/pricing",
    "/login",
    "/register",
    "/privacy",
    "/terms",
    "/member/weekly",
    "/member/monthly",
    "/member/ai-trading",
  ];
  const now = new Date();
  return paths.flatMap((path) => {
    const priority = path === "/" ? 1 : path.startsWith("/member/") ? 0.6 : 0.7;
    const changeFrequency = path === "/" ? "daily" as const : "weekly" as const;
    return [
      { url: `${base}${path}`, lastModified: now, changeFrequency, priority },
      { url: `${base}${englishPath(path)}`, lastModified: now, changeFrequency, priority },
    ];
  });
}
