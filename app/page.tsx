import {
  AnalystFrameworkSection,
  AssetCategoriesSection,
  BitcoinForecastPathSection,
  ChinaEquityLongRangeSection,
  ConsensusOverviewSection,
  FeaturedForecastsSection,
  FinalCtaSection,
  ForecastDetailPreviewSection,
  HeroSection,
  MethodologySection,
  ResearchSection,
  StrategicWatchlistSection,
  TodaysIntelligenceSection,
  TodaysMoonXViewSection,
  UpcomingTurningWindowsSection,
  VerificationSection,
} from "@/components/sections";

export default function HomePage() {
  return (
    <main>
      <HeroSection />
      <TodaysMoonXViewSection />
      <ConsensusOverviewSection />
      <TodaysIntelligenceSection />
      <BitcoinForecastPathSection />
      <ChinaEquityLongRangeSection />
      <StrategicWatchlistSection />
      <UpcomingTurningWindowsSection />
      <AssetCategoriesSection />
      <FeaturedForecastsSection />
      <ForecastDetailPreviewSection />
      <MethodologySection />
      <AnalystFrameworkSection />
      <VerificationSection />
      <ResearchSection />
      <FinalCtaSection />
    </main>
  );
}
