import { getFeatureFlags } from "@/lib/feature-flags";
import { HomeTodaySection } from "@/components/home/HomeTodaySection";
import { HomeYesterdayReview } from "@/components/home/HomeYesterdayReview";
import { HomeAccuracySummary } from "@/components/home/HomeAccuracySummary";
import { HomeMemberStocksSection } from "@/components/home/HomeMemberStocksSection";
import { HomePricingEntry } from "@/components/home/HomePricingEntry";
import { MemberForecastTeaser } from "@/components/home/MemberForecastTeaser";
import { HomeTomorrowSection } from "@/components/home/HomeTomorrowSection";
import { HomeWeeklySection } from "@/components/home/HomeWeeklySection";
import { HeroSection } from "@/components/sections";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HomePage() {
  const flags = getFeatureFlags();

  return (
    <main>
      <HeroSection />
      <HomeTodaySection />
      <HomeYesterdayReview />
      {flags.memberForecastEnabled ? <HomeTomorrowSection /> : <MemberForecastTeaser />}
      {flags.memberForecastEnabled ? <HomeWeeklySection /> : null}
      {flags.memberForecastEnabled ? <HomeMemberStocksSection /> : null}
      <HomeAccuracySummary />
      <HomePricingEntry />
    </main>
  );
}
