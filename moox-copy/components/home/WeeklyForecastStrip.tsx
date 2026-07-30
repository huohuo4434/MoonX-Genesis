import { WeeklyForecastClient } from "@/components/home/WeeklyForecastClient";
import { getCurrentWeeklyEdition } from "@/lib/data/weekly-edition";

export async function WeeklyForecastStrip() {
  const edition = await getCurrentWeeklyEdition();
  return <WeeklyForecastClient edition={edition} />;
}
