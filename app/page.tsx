import {
  AltcoinRotationHomeSection,
  BitcoinForecastPathSection,
  ChinaEquityLongRangeSection,
  ConsensusOverviewSection,
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
