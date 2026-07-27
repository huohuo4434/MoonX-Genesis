import {
  HomeTodaySection,
  HomeTomorrowSection,
  HomeMultiHorizonSection,
  HomeScenarioChartSection,
  LatestResearchSection,
  LongTermOutlookSection,
  MethodologyEntry,
  StrategicWatchlistPreview,
  WeeklyForecastStrip,
} from "@/components/home";
import { HeroSection } from "@/components/sections";

export default function HomePage() {
  return (
    <main>
      <HeroSection />
      <HomeTomorrowSection />
      <HomeTodaySection />
      <WeeklyForecastStrip />
      <HomeMultiHorizonSection />
      <HomeScenarioChartSection />
      <LatestResearchSection />
      <LongTermOutlookSection />
      <StrategicWatchlistPreview />
      <MethodologyEntry />
    </main>
  );
}
