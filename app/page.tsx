import type { Metadata } from "next";
import { buildLocalizedPageMetadata, getRequestLocale } from "@/lib/i18n/server";
import { CreatorHome } from "@/components/community/CreatorHome";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return buildLocalizedPageMetadata({
    locale,
    basePath: "/",
    titleZh: "易老师观点 | MOOX",
    titleEn: "Teacher Yi’s Views | MOOX",
    descriptionZh:
      "易老师不定期分享市场观点、图文分析与复盘。公开观点免费阅读，会员观点保留专属讨论。",
    descriptionEn:
      "Independent market observations, charts and reviews by Teacher Yi. Read public posts and explore the member views.",
  });
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HomePage() {
  return <CreatorHome en={(await getRequestLocale()) === "en"} />;
}
