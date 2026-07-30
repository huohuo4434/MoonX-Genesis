import type { MetadataRoute } from "next";

/** Public sitemap only — no internal research / admin / member forecast URLs. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://moon-x-genesis.vercel.app";
  const paths = ["/", "/featured-stocks", "/verification", "/pricing", "/login", "/register", "/privacy", "/terms"];
  return paths.map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: path === "/" ? 1 : 0.7,
  }));
}
