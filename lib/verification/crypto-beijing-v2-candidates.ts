import type { DailyForecastRecord, DailyVerificationResult } from "@/types/daily-accuracy";

export const CRYPTO_BEIJING_V2_START = "2026-08-01";
export const CRYPTO_BEIJING_V2_MARKER = "crypto-beijing-v2";

const AUDITABLE_VERDICTS = new Set([
  "HIT",
  "FULL_HIT",
  "PARTIAL_HIT",
  "MISS",
] as const);

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
