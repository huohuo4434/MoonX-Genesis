import "server-only";

import {
  listDailyForecastRecords,
  listDailyVerificationResults,
  replaceDailyVerificationResult,
  upsertDailyForecastRecord,
} from "@/lib/data/daily-accuracy-store";
import { runDailyVerification } from "@/lib/verification/run-daily";
import {
  CRYPTO_BEIJING_V2_MARKER,
  selectCryptoBeijingV2Candidates,
} from "@/lib/verification/crypto-beijing-v2-candidates";
import type { DailyForecastRecord } from "@/types/daily-accuracy";

const NON_AUDITABLE_AFTER_REVERIFY = new Set([
  "UNVERIFIABLE",
  "MANUAL_REVIEW",
]);

export type CryptoBeijingReverifyReport = {
  scanned: number;
  candidates: number;
  upgraded: number;
  restoredPrior: number;
  unchanged: number;
  candidateIds: string[];
};

export async function runCryptoBeijingV2Reverification(): Promise<CryptoBeijingReverifyReport> {
  const beforeForecasts = await listDailyForecastRecords();
  const beforeResults = await listDailyVerificationResults();
  const candidateIds = selectCryptoBeijingV2Candidates(beforeForecasts, beforeResults);

  const report: CryptoBeijingReverifyReport = {
    scanned: beforeForecasts.length,
    candidates: candidateIds.length,
    upgraded: 0,
    restoredPrior: 0,
    unchanged: 0,
    candidateIds,
  };
  if (!candidateIds.length) return report;

  const priorForecastById = new Map(beforeForecasts.map((row) => [row.id, row]));
  const priorResultById = new Map(beforeResults.map((row) => [row.forecastId, row]));

  // Reuse the production verifier, but bypass the historical lock only for the selected
  // crypto records. V7.17.7 deliberately does not modify run-daily.ts itself.
  await runDailyVerification({ forceRefetchForecastIds: candidateIds });

  const afterForecasts = await listDailyForecastRecords();
  const afterResults = await listDailyVerificationResults();
  const afterForecastById = new Map(afterForecasts.map((row) => [row.id, row]));
  const afterResultById = new Map(afterResults.map((row) => [row.forecastId, row]));

  for (const id of candidateIds) {
    const prior = priorResultById.get(id);
    const next = afterResultById.get(id);
    const priorForecast = priorForecastById.get(id);
    const nextForecast = afterForecastById.get(id);

    if (!prior || !next) {
      report.unchanged += 1;
      continue;
    }

    const hasNewMarker = String(next.dataSource ?? "").includes(CRYPTO_BEIJING_V2_MARKER);
    const becameNonAuditable = NON_AUDITABLE_AFTER_REVERIFY.has(next.verdict);

    if (!hasNewMarker || becameNonAuditable) {
      // Fail closed: a migration may improve an auditable historical result, but it must
      // never erase it merely because a provider no longer retains enough intraday bars.
      await replaceDailyVerificationResult(prior);
      if (priorForecast) {
        await upsertDailyForecastRecord({
          ...(nextForecast ?? priorForecast),
          status: priorForecast.status,
        } satisfies DailyForecastRecord);
      }
      report.restoredPrior += 1;
      continue;
    }

    report.upgraded += 1;
  }

  return report;
}
