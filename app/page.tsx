import {
  HomeTodaySection,
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
      <HomeTodaySection />
      <WeeklyForecastStrip />
      <HomeScenarioChartSection />
      <LatestResearchSection />
      <LongTermOutlookSection />
      <StrategicWatchlistPreview />
      <MethodologyEntry />
    </main>
  );
}
