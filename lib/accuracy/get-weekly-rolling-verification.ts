import "server-only";

import { unstable_noStore as noStore } from "next/cache";
import { listDailyForecastRecords, listDailyVerificationResults } from "@/lib/data/moonx-data-store";
import { buildWeeklyRollingVerification } from "@/lib/verification/weekly-rolling-core";
import { getWeeklyRollingActuals } from "@/lib/accuracy/get-weekly-rolling-actuals";
import type { WeeklyMarketSlot } from "@/types/weekly-analysis";
import type { WeeklyRollingVerification } from "@/types/weekly-rolling-verification";

export async function getWeeklyRollingVerification(
  slots: readonly WeeklyMarketSlot[],
  now = new Date(),
): Promise<WeeklyRollingVerification[]> {
  noStore();
  const [forecasts, results] = await Promise.all([
    listDailyForecastRecords(),
    listDailyVerificationResults(),
  ]);
  const actuals = await getWeeklyRollingActuals(slots, results, now);
  return slots.flatMap((slot) => slot.kind === "published"
    ? [buildWeeklyRollingVerification({ weekly: slot.analysis, forecasts, results, actuals, now })]
    : []);
}
