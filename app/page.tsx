import {
  AltcoinRotationHomeSection,
  BitcoinForecastPathSection,
  ChinaEquityLongRangeSection,
  ConsensusOverviewSection,
  DailyMarketForecastSection,
  HeroSection,
  MacroRiskCalendarSection,
  StrategicWatchlistSection,
  TechnicalSignalsHomeSection,
  TodaysMoonXViewSection,
  UpcomingTurningWindowsSection,
  VerificationSection,
} from "@/components/sections";

export default function HomePage() {
  return (
    <main>
      <HeroSection />
      <TodaysMoonXViewSection />
      <DailyMarketForecastSection />
      <ConsensusOverviewSection />
      <TechnicalSignalsHomeSection />
      <MacroRiskCalendarSection />
      <BitcoinForecastPathSection />
      <ChinaEquityLongRangeSection />
      <AltcoinRotationHomeSection />
      <StrategicWatchlistSection />
      <UpcomingTurningWindowsSection />
      <VerificationSection />
    </main>
  );
}
