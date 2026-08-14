import type { Metadata } from "next";
import { buildLocalizedPageMetadata, getRequestLocale } from "@/lib/i18n/server";
import { HomeTodaySection } from "@/components/home/HomeTodaySection";
import { HomeRecentVerification } from "@/components/home/HomeRecentVerification";
import { HomeTomorrowSection } from "@/components/home/HomeTomorrowSection";
import { HomeFeaturedAssets } from "@/components/home/HomeFeaturedAssets";
import { HomePricingEntry } from "@/components/home/HomePricingEntry";
import { HomeMembershipComparison } from "@/components/home/HomeMembershipComparison";
import { HomeQuickStart } from "@/components/home/HomeQuickStart";
import { HeroSection } from "@/components/sections";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return buildLocalizedPageMetadata({
    locale,
    basePath: "/",
    titleZh: "MOOX Intelligence",
    titleEn: "MOOX Intelligence | Direction First. Confirmation Before Entry.",
    descriptionZh: "先判方向，再等确认。MOOX提供主要市场方向、情景权重、路径、关键价位与公开验证。",
    descriptionEn: "Structured market outlooks for Bitcoin, Ether, global equity indices, gold, silver and WTI—combining Liu Yao directional analysis, Qimen timing, technical market structure, key levels and public verification.",
  });
}


export const dynamic = "force-dynamic";
export const revalidate = 0;


/**
 * Single official homepage — no alternate research/timeline landing.
 * Hero → Today gate (server ACL) → Recent verification → Featured assets → Membership CTA.
 */
export default async function HomePage() {
  return (
    <main className="mx-auto w-full max-w-[1200px]">
      <HeroSection />
      <HomeQuickStart />
      <HomeTodaySection />
      <HomeTomorrowSection />
      <HomeFeaturedAssets />
      <HomeRecentVerification />
      <HomeMembershipComparison />
      <HomePricingEntry />
    </main>
  );
}
