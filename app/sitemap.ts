import type { MetadataRoute } from "next";

/** Public sitemap only — no internal research / admin URLs. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://moon-x-genesis.vercel.app";
  const paths = [
    "/",
    "/member/tomorrow",
    "/member/weekly",
    "/featured-stocks",
    "/member/stocks",
    "/verification",
    "/methodology",
    "/pricing",
    "/account",
    "/login",
    "/privacy",
    "/terms",
  ];
  return paths.map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: path === "/" ? 1 : 0.7,
  }));
}
