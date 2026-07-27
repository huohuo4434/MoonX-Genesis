import {
  AltcoinRotationHomeSection,
  BitcoinForecastPathSection,
  ChinaEquityLongRangeSection,
  ConsensusOverviewSection,
  HeroSection,
  StrategicWatchlistSection,
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
      <BitcoinForecastPathSection />
      <ChinaEquityLongRangeSection />
      <AltcoinRotationHomeSection />
      <StrategicWatchlistSection />
      <UpcomingTurningWindowsSection />
      <VerificationSection />
    </main>
  );
}
