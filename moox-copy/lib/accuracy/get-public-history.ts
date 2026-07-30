/**
 * Server loader for public historical accuracy.
 * Never returns today / tomorrow / pending / draft records.
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

export type PublicAccuracyHistoryPayload = {
  todayKey: string;
  items: PublicAccuracyHistoryItem[];
  stats: DailyAccuracyStats;
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
  const items = filterPublicAccuracyHistory({ forecasts, results, now });
  const stats = computePublicAccuracyStats(items, now);
  return {
    todayKey,
    items,
    stats,
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
