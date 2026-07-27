import { HomeScenarioChart } from "@/components/home/HomeScenarioChart";
import { getForecastChartScenario } from "@/lib/data/forecast-chart-scenarios";

export async function HomeScenarioChartSection() {
  const scenario = await getForecastChartScenario("bitcoin");
  return <HomeScenarioChart scenario={scenario ?? null} />;
}
