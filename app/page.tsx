import type { Metadata } from "next";
import { buildLocalizedPageMetadata, getRequestLocale } from "@/lib/i18n/server";
import { HomeLandingBoard } from "@/components/home/HomeLandingBoard";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return buildLocalizedPageMetadata({
    locale,
    basePath: "/",
    titleZh: "MOOX Intelligence",
    titleEn: "MOOX Intelligence | Direction First, Confirmation Before Entry",
    descriptionZh:
      "了解比特币、以太坊、纳斯达克100、黄金和白银的市场研究。免费体验今日基础观点，会员解锁周月展望、关键日期与技术价位。",
    descriptionEn:
      "Market research for Bitcoin, Ether, Nasdaq 100, gold and silver. Start with free daily views; explore membership for weekly and monthly outlooks, key dates and technical levels.",
  });
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function HomePage() {
  return <HomeLandingBoard />;
}
