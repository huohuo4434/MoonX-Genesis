import "server-only";

import { hasPrisma } from "@/lib/prisma";
import type { DailyVerificationResult } from "@/types/daily-accuracy";
import { isPublicFinalVerdict, isTerminalVerificationVerdict } from "@/lib/accuracy/public-history-filter";
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
  state:
    | "ACTIVE"
    | "WAITING"
    | "SYNC_GAP"
    | "BUILDING"
    | "LEGACY_ONLY"
    | "SOURCE_DEGRADED"
    | "DEGRADED";
  sourceAvailable: boolean;
  generatedSourceHealthy: boolean;
  generatedLocked: number;
  verificationRecords: number;
  pending: number;
  completed: number;
  unverifiable: number;
  excluded: number;
  syncMissing: number;
  latestLockedAt: string | null;
  latestVerifiedAt: string | null;
  checkedAt: string;
  error: "generated_source_unavailable" | "legacy_store_unavailable" | null;
};

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
  const sourceAvailable = hasPrisma();

  // The immutable verification store is authoritative for records/results that
  // users can already see. Never erase these counters just because the upstream
  // GeneratedDailyForecast source has a transient runtime/schema problem.
  let records: Awaited<ReturnType<typeof listDailyForecastRecords>>;
  let results: Awaited<ReturnType<typeof listDailyVerificationResults>>;
  try {
    [records, results] = await Promise.all([
      listDailyForecastRecords(),
      listDailyVerificationResults(),
    ]);
  } catch (error) {
    console.error("[verification-pipeline-status] legacy verification store unavailable", error);
    return {
      state: "DEGRADED",
      sourceAvailable,
      generatedSourceHealthy: false,
      generatedLocked: 0,
      verificationRecords: 0,
      pending: 0,
      completed: 0,
      unverifiable: 0,
      excluded: 0,
      syncMissing: 0,
      latestLockedAt: null,
      latestVerifiedAt: null,
      checkedAt,
      error: "legacy_store_unavailable",
    };
  }

  const formalRecords = records.filter(
    (record) =>
      !record.isSystemTest &&
      record.forecastDate >= OFFICIAL_GENERATED_DAILY_SYNC_START &&
      record.status !== "draft"
  );
  const resultById = new Map(results.map((result) => [result.forecastId, result]));
  const terminalResults = formalRecords
    .map((record) => resultById.get(record.id))
    .filter((result): result is DailyVerificationResult => Boolean(result && isTerminalVerificationVerdict(result.verdict)));
  const publicCompletedResults = terminalResults.filter((result) => isPublicFinalVerdict(result.verdict));
  const pending = formalRecords.filter((record) => {
    const result = resultById.get(record.id);
    return !result || !isTerminalVerificationVerdict(result.verdict);
  }).length;
  const completed = publicCompletedResults.length;
  const unverifiable = publicCompletedResults.filter((result) => result.verdict === "UNVERIFIABLE").length;
  const excluded = terminalResults.filter((result) => result.verdict === "VOID").length;
  const latestVerifiedAt = maxIso(terminalResults.map((result) => result.verifiedAt));

  if (!sourceAvailable) {
    return {
      state: formalRecords.length || completed ? "LEGACY_ONLY" : "BUILDING",
      sourceAvailable: false,
      generatedSourceHealthy: false,
      generatedLocked: 0,
      verificationRecords: formalRecords.length,
      pending,
      completed,
      unverifiable,
      excluded,
      syncMissing: 0,
      latestLockedAt: null,
      latestVerifiedAt,
      checkedAt,
      error: null,
    };
  }

  let generated: Awaited<ReturnType<typeof listFormalGeneratedDailiesForVerification>>;
  try {
    generated = await listFormalGeneratedDailiesForVerification(now);
  } catch (error) {
    console.error("[verification-pipeline-status] GeneratedDailyForecast source unavailable", error);
    return {
      state: "SOURCE_DEGRADED",
      sourceAvailable: true,
      generatedSourceHealthy: false,
      generatedLocked: 0,
      verificationRecords: formalRecords.length,
      pending,
      completed,
      unverifiable,
      excluded,
      syncMissing: 0,
      latestLockedAt: null,
      latestVerifiedAt,
      checkedAt,
      error: "generated_source_unavailable",
    };
  }

  const supported = generated.flatMap((row) => {
    const asset = verificationAssetForMarketCode(row.marketCode);
    return asset ? [{ row, asset }] : [];
  });
  const generatedLocked = supported.length;
  const latestLockedAt = maxIso(
    supported.map(({ row }) =>
      (row.lockedAt ?? row.publishedAt ?? row.generatedAt ?? row.createdAt).toISOString()
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
  const syncMissing = supported.filter(({ row, asset }) =>
    !identities.has(
      generatedVerificationIdentity({
        forecastDate: row.forecastDate,
        symbol: asset.symbol,
        version: Math.max(1, Number(row.version) || 1),
      })
    )
  ).length;

  const state: VerificationPipelineStatus["state"] =
    syncMissing > 0
      ? "SYNC_GAP"
      : pending > 0
        ? "WAITING"
        : completed > 0 || excluded > 0
          ? "ACTIVE"
          : "BUILDING";

  return {
    state,
    sourceAvailable: true,
    generatedSourceHealthy: true,
    generatedLocked,
    verificationRecords: formalRecords.length,
    pending,
    completed,
    unverifiable,
    excluded,
    syncMissing,
    latestLockedAt,
    latestVerifiedAt,
    checkedAt,
    error: null,
  };
}
