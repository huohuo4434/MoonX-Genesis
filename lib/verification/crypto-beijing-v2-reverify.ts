import "server-only";

import {
  listDailyForecastRecords,
  listDailyVerificationResults,
} from "@/lib/data/daily-accuracy-store";
import { runDailyVerification } from "@/lib/verification/run-daily";
import {
  rotatingCryptoBatch,
  selectCryptoBeijingV2Candidates,
} from "@/lib/verification/crypto-beijing-v2-candidates";
import { isSessionReadyToVerify } from "@/lib/verification/session-ready";

export type CryptoBeijingReverifyReport = {
  scanned: number;
  candidates: number;
  upgraded: number;
  restoredPrior: number;
  preservedPrior: number;
  writeOutcomeUnknown: number;
  deferred: number;
  errors: string[];
  unchanged: number;
  candidateIds: string[];
};

export async function runCryptoBeijingV2Reverification(): Promise<CryptoBeijingReverifyReport> {
  const now = new Date();
  const deadlineAt = Date.now() + 180_000;
  const beforeForecasts = await listDailyForecastRecords();
  const beforeResults = await listDailyVerificationResults();
  const allIds = selectCryptoBeijingV2Candidates(
    beforeForecasts.filter((row) => isSessionReadyToVerify(row.market, row.forecastDate, now)), beforeResults
  );
  const candidateIds = rotatingCryptoBatch(allIds, now);

  const report: CryptoBeijingReverifyReport = {
    scanned: beforeForecasts.length,
    candidates: allIds.length,
    upgraded: 0,
    restoredPrior: 0,
    preservedPrior: 0,
    writeOutcomeUnknown: 0,
    deferred: allIds.length - candidateIds.length,
    errors: [],
    unchanged: 0,
    candidateIds,
  };
  if (!candidateIds.length) return report;

  // Strict scope skips sync/reviews. Reject non-auditable replacements BEFORE any
  // write, rather than relying on a later restore which a hard timeout can prevent.
  const result = await runDailyVerification({
    now, forecastIds: candidateIds, forceRefetchForecastIds: candidateIds,
    cryptoBeijingMigration: true, maxRecords: 2, deadlineAt,
  });
  report.upgraded = result.verified;
  report.preservedPrior = result.preservedPrior;
  report.writeOutcomeUnknown = result.writeOutcomeUnknown;
  report.unchanged = Math.max(0, candidateIds.length - result.verified - result.deferred - result.writeOutcomeUnknown);
  report.deferred += result.deferred;
  report.errors = result.errors;

  return report;
}
