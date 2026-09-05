import type { DailyForecastRecord, DailyVerificationResult } from "@/types/daily-accuracy";

export const CRYPTO_BEIJING_V2_START = "2026-08-01";
export const CRYPTO_BEIJING_V2_MARKER = "crypto-beijing-v2";

const AUDITABLE_VERDICTS = new Set([
  "HIT",
  "FULL_HIT",
  "PARTIAL_HIT",
  "MISS",
] as const);

/** Accept a migration before any write, including HIT -> MISS corrections. */
export function isAuditableCryptoBeijingV2Result(result: DailyVerificationResult): boolean {
  return AUDITABLE_VERDICTS.has(result.verdict as "HIT" | "FULL_HIT" | "PARTIAL_HIT" | "MISS") &&
    String(result.dataSource ?? "").includes(CRYPTO_BEIJING_V2_MARKER);
}

/** Failed historical rows must not permanently occupy the first batch. */
export function rotatingCryptoBatch(ids: string[], now: Date, limit = 2): string[] {
  const sorted = [...new Set(ids)].sort();
  if (!sorted.length || !Number.isFinite(now.getTime()) || !Number.isInteger(limit) || limit <= 0) return [];
  const size = Math.min(limit, sorted.length);
  const start = (Math.floor(now.getTime() / 3_600_000) % Math.ceil(sorted.length / size)) * size;
  return sorted.slice(start, start + size);
}

export function selectCryptoBeijingV2Candidates(
  forecasts: DailyForecastRecord[],
  results: DailyVerificationResult[]
): string[] {
  const resultById = new Map(results.map((row) => [row.forecastId, row]));
  return forecasts
    .filter((forecast) => {
      if (forecast.market !== "CRYPTO") return false;
      if (forecast.forecastDate < CRYPTO_BEIJING_V2_START) return false;
      const prior = resultById.get(forecast.id);
      if (!prior) return false;
      if (!AUDITABLE_VERDICTS.has(prior.verdict as "HIT" | "FULL_HIT" | "PARTIAL_HIT" | "MISS")) {
        return false;
      }
      return !String(prior.dataSource ?? "").includes(CRYPTO_BEIJING_V2_MARKER);
    })
    .map((forecast) => forecast.id);
}
