import type { Metadata } from "next";
import { DailyMarketForecastSection } from "@/components/sections/DailyMarketForecastSection";

export const metadata: Metadata = { title: "Daily Market Forecasts", description: "MoonX daily BTC, SPX, NDX, and gold forecast editions." };

export default function DailyForecastsPage() {
  return <main><DailyMarketForecastSection /></main>;
}
