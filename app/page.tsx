import { getFeatureFlags } from "@/lib/feature-flags";
import { HomeDailyForecastEditionSection } from "@/components/home/HomeDailyForecastEditionSection";
import { HomeAccuracySummary } from "@/components/home/HomeAccuracySummary";
import { HomePricingEntry } from "@/components/home/HomePricingEntry";
import { MemberForecastTeaser } from "@/components/home/MemberForecastTeaser";
import { HeroSection } from "@/components/sections";
import { ConsensusOverviewSection } from "@/components/sections/ConsensusOverviewSection";
import { TechnicalSignalsHomeSection } from "@/components/sections/TechnicalSignalsHomeSection";
import { MacroRiskCalendarSection } from "@/components/sections/MacroRiskCalendarSection";
import { BitcoinForecastPathSection } from "@/components/sections/BitcoinForecastPathSection";
import { StrategicWatchlistPreview } from "@/components/home/StrategicWatchlistPreview";
import { LongTermOutlookSection } from "@/components/home/LongTermOutlookSection";
import { HomeTomorrowSection } from "@/components/home/HomeTomorrowSection";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HomePage() {
  const flags = getFeatureFlags();

  return (
    <main>
      <HomeDailyForecastEditionSection />
      <HeroSection />
      {flags.memberForecastEnabled ? <HomeTomorrowSection /> : <MemberForecastTeaser />}
      <ConsensusOverviewSection />
      <TechnicalSignalsHomeSection />
      <MacroRiskCalendarSection />
      <BitcoinForecastPathSection />
      <StrategicWatchlistPreview />
      <LongTermOutlookSection />
      <HomeAccuracySummary />
      <HomePricingEntry />
    </main>
  );
}
