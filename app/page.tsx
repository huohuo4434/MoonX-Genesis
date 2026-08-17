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
      "首页聚焦九大核心市场的今日方向、信心星级、关键支撑与压力，并保留明日看点、验证记录、缠论与AI自动交易入口。",
    descriptionEn:
      "A simplified market dashboard focused on the nine core markets, confidence stars, key levels, tomorrow views, verification, Chan structure and AI execution.",
  });
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function HomePage() {
  return <HomeLandingBoard />;
}
