import "server-only";

import { hasPrisma } from "@/lib/prisma";
import type { DailyVerificationResult } from "@/types/daily-accuracy";
import {
  listDailyForecastRecords,
  listDailyVerificationResults,
} from "@/lib/data/daily-accuracy-store";
import {
  OFFICIAL_GENERATED_DAILY_SYNC_START,
  generatedVerificationIdentity,
  listFormalGeneratedDailiesForVerification,
  verificationAssetForMarketCode,
} from "@/lib/verification/sync-generated-dailies";

export type VerificationPipelineStatus = {
  state: "ACTIVE" | "WAITING" | "SYNC_GAP" | "BUILDING" | "LEGACY_ONLY" | "DEGRADED";
  sourceAvailable: boolean;
  generatedLocked: number;
  verificationRecords: number;
  pending: number;
  completed: number;
  unverifiable: number;
  syncMissing: number;
  latestLockedAt: string | null;
  latestVerifiedAt: string | null;
  checkedAt: string;
  error: string | null;
};

const FINAL_VERDICTS = new Set([
  "HIT",
  "FULL_HIT",
  "PARTIAL_HIT",
  "MISS",
  "UNVERIFIABLE",
  "VOID",
]);

function maxIso(values: Array<string | null | undefined>): string | null {
  let best: string | null = null;
  let bestMs = -Infinity;
  for (const value of values) {
    if (!value) continue;
    const ms = new Date(value).getTime();
    if (Number.isFinite(ms) && ms > bestMs) {
      bestMs = ms;
      best = value;
    }
  }
  return best;
}

export async function getVerificationPipelineStatus(now = new Date()): Promise<VerificationPipelineStatus> {
  const checkedAt = now.toISOString();
  try {
    const [records, results] = await Promise.all([
      listDailyForecastRecords(),
      listDailyVerificationResults(),
    ]);
    const formalRecords = records.filter(
      (record) =>
        !record.isSystemTest &&
        record.forecastDate >= OFFICIAL_GENERATED_DAILY_SYNC_START &&
        record.status !== "draft"
    );
    const resultById = new Map(results.map((result) => [result.forecastId, result]));
    const completedResults = formalRecords
      .map((record) => resultById.get(record.id))
      .filter((result): result is DailyVerificationResult => Boolean(result && FINAL_VERDICTS.has(result.verdict)));
    const pending = formalRecords.filter((record) => {
      const result = resultById.get(record.id);
      return !result || !FINAL_VERDICTS.has(result.verdict);
    }).length;

    let generatedLocked = 0;
    let syncMissing = 0;
    let latestLockedAt: string | null = null;
    const sourceAvailable = hasPrisma();
    if (sourceAvailable) {
      const generated = await listFormalGeneratedDailiesForVerification(now);
      const supported = generated.flatMap((row) => {
        const asset = verificationAssetForMarketCode(row.marketCode);
        return asset ? [{ row, asset }] : [];
      });
      generatedLocked = supported.length;
      latestLockedAt = maxIso(
        supported.map(({ row }) =>
          (row.lockedAt ?? row.publishedAt ?? row.generatedAt).toISOString()
        )
      );
      const identities = new Set(
        formalRecords.map((record) =>
          generatedVerificationIdentity({
            forecastDate: record.forecastDate,
            symbol: record.symbol,
            version: record.originalVersion,
          })
        )
      );
      syncMissing = supported.filter(({ row, asset }) =>
        !identities.has(
          generatedVerificationIdentity({
            forecastDate: row.forecastDate,
            symbol: asset.symbol,
            version: row.version,
          })
        )
      ).length;
    }

    const completed = completedResults.length;
    const unverifiable = completedResults.filter((result) => result?.verdict === "UNVERIFIABLE").length;
    const latestVerifiedAt = maxIso(completedResults.map((result) => result.verifiedAt));
    const state: VerificationPipelineStatus["state"] =
      !sourceAvailable
        ? formalRecords.length || completed
          ? "LEGACY_ONLY"
          : "BUILDING"
        : syncMissing > 0
          ? "SYNC_GAP"
          : pending > 0
            ? "WAITING"
            : completed > 0
              ? "ACTIVE"
              : "BUILDING";

    return {
      state,
      sourceAvailable,
      generatedLocked,
      verificationRecords: formalRecords.length,
      pending,
      completed,
      unverifiable,
      syncMissing,
      latestLockedAt,
      latestVerifiedAt,
      checkedAt,
      error: null,
    };
  } catch (error) {
    console.error("[verification-pipeline-status]", error);
    return {
      state: "DEGRADED",
      sourceAvailable: hasPrisma(),
      generatedLocked: 0,
      verificationRecords: 0,
      pending: 0,
      completed: 0,
      unverifiable: 0,
      syncMissing: 0,
      latestLockedAt: null,
      latestVerifiedAt: null,
      checkedAt,
      error: "verification_status_unavailable",
    };
  }
}
