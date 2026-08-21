import "server-only";

import { unstable_noStore as noStore } from "next/cache";
import { getChinaDateKey } from "@/lib/date/china-date";
import { listDailyForecastRecords, listDailyVerificationResults } from "@/lib/data/moonx-data-store";
import { isTerminalVerificationVerdict, OFFICIAL_DAILY_VERIFICATION_START, selectCanonicalDailyForecasts } from "@/lib/accuracy/public-history-filter";

export type PendingVerificationItem = {
  forecastId: string;
  forecastDate: string;
  assetName: string;
  symbol: string;
  lockedAt: string;
  cutoffAt: string;
  phase: "OBSERVING" | "AWAITING_RESULT";
};

export async function getPendingVerificationRecords(
  now = new Date(),
  limit = 18
): Promise<PendingVerificationItem[]> {
  noStore();
  const todayKey = getChinaDateKey(now);
  const [forecasts, results] = await Promise.all([
    listDailyForecastRecords(),
    listDailyVerificationResults(),
  ]);

  const finalized = new Set(
    results
      .filter((result) => Boolean(result.verifiedAt) && isTerminalVerificationVerdict(result.verdict))
      .map((result) => result.forecastId)
  );

  const earliest = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  return selectCanonicalDailyForecasts(forecasts)
    .filter((forecast) => {
      if (forecast.forecastDate < OFFICIAL_DAILY_VERIFICATION_START) return false;
      if (forecast.forecastDate < earliest || forecast.forecastDate > todayKey) return false;
      return !finalized.has(forecast.id);
    })
    .map((forecast) => {
      const cutoff = Date.parse(forecast.cutoffAt);
      return {
        forecastId: forecast.id,
        forecastDate: forecast.forecastDate,
        assetName: forecast.assetName,
        symbol: forecast.symbol,
        lockedAt: forecast.publishedAt,
        cutoffAt: forecast.cutoffAt,
        phase: Number.isFinite(cutoff) && cutoff > now.getTime()
          ? "OBSERVING" as const
          : "AWAITING_RESULT" as const,
      };
    })
    .sort((a, b) => {
      const phase = a.phase.localeCompare(b.phase);
      if (phase !== 0) return phase;
      const date = b.forecastDate.localeCompare(a.forecastDate);
      return date !== 0 ? date : a.symbol.localeCompare(b.symbol);
    })
    .slice(0, Math.max(1, Math.min(50, Math.floor(limit))));
}
