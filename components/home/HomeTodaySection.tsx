import { TodayDailyForecastView } from "@/components/home/TodayDailyForecastView";
import { getTodayPublicForecastPayload } from "@/lib/data/tomorrow-forecast-access";

export async function HomeTodaySection() {
  const { forecasts } = await getTodayPublicForecastPayload();
  return <TodayDailyForecastView forecasts={forecasts} />;
}
