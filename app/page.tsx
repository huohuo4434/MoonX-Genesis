import { HomeTodaySection } from "@/components/home/HomeTodaySection";
import { HomeRecentVerification } from "@/components/home/HomeRecentVerification";
import { HomeFeaturedAssets } from "@/components/home/HomeFeaturedAssets";
import { HomePricingEntry } from "@/components/home/HomePricingEntry";
import { HeroSection } from "@/components/sections";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "首页",
  robots: { index: true, follow: true },
};

/**
 * Single official homepage — no alternate research/timeline landing.
 * Hero → Today gate (server ACL) → Recent verification → Featured assets → Membership CTA.
 */
export default async function HomePage() {
  return (
    <main className="mx-auto w-full max-w-[1200px]">
      <HeroSection />
      <HomeTodaySection />
      <HomeRecentVerification />
      <HomeFeaturedAssets />
      <HomePricingEntry />
    </main>
  );
}
