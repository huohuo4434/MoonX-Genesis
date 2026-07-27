import {
  AltcoinRotationHomeSection,
  BitcoinForecastPathSection,
  ChinaEquityLongRangeSection,
  ConsensusOverviewSection,
  HeroSection,
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
      <BitcoinForecastPathSection />
      <ChinaEquityLongRangeSection />
      <AltcoinRotationHomeSection />
      <StrategicWatchlistSection />
      <UpcomingTurningWindowsSection />
      <VerificationSection />
    </main>
  );
}
