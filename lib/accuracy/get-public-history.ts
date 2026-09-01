/**
 * Server loader for public historical accuracy.
 * Never returns future / pending / draft records; verified same-day market-close results are allowed.
 */
import "server-only";

import { unstable_noStore as noStore } from "next/cache";
import { getChinaDateKey } from "@/lib/date/china-date";
import {
  listDailyForecastRecords,
  listDailyVerificationResults,
} from "@/lib/data/moonx-data-store";
import {
  computePublicAccuracyStats,
  filterPublicAccuracyHistory,
  type PublicAccuracyHistoryItem,
} from "@/lib/accuracy/public-history-filter";
import type { DailyAccuracyStats } from "@/types/daily-accuracy";
import { isActivePredictionSymbol, PUBLIC_PREDICTION_SCOPE } from "@/lib/prediction-scope";

export type PublicAccuracyHistoryPayload = {
  todayKey: string;
  items: PublicAccuracyHistoryItem[];
  stats: DailyAccuracyStats;
  allMarketStats: DailyAccuracyStats;
  scope: typeof PUBLIC_PREDICTION_SCOPE;
  latestVisibleDate: string | null;
};

export async function getPublicAccuracyHistory(
  now = new Date()
): Promise<PublicAccuracyHistoryPayload> {
  noStore();
  const todayKey = getChinaDateKey(now);
  const [forecasts, results] = await Promise.all([
    listDailyForecastRecords(),
    listDailyVerificationResults(),
  ]);
  const allMarketItems = filterPublicAccuracyHistory({ forecasts, results, now });
  const items = allMarketItems.filter((item) => isActivePredictionSymbol(item.symbol));
  const stats = computePublicAccuracyStats(items, now);
  return {
    todayKey,
    items,
    stats,
    allMarketStats: computePublicAccuracyStats(allMarketItems, now),
    scope: PUBLIC_PREDICTION_SCOPE,
    latestVisibleDate: items[0]?.forecastDate ?? null,
  };
}

export {
  filterPublicAccuracyHistory,
  computePublicAccuracyStats,
  isPublicFinalVerdict,
  isPublicCountableVerdict,
  PUBLIC_FINAL_VERDICTS,
  PUBLIC_COUNTABLE_VERDICTS,
  type PublicAccuracyHistoryItem,
} from "@/lib/accuracy/public-history-filter";
