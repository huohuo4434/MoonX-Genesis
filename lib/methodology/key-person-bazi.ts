export type KeyPersonBaziDataQuality = "VERIFIED_TIME" | "TIME_UNCERTAIN" | "TIME_UNKNOWN";

export type KeyPersonBaziPolicy = {
  minHorizon: "MONTH";
  defaultWeightPct: number;
  maxWeightPct: number;
  unknownTimeMaxWeightPct: number;
  mayOverrideAssetHexagram: false;
  mayVoteDailyDirection: false;
  maySetTechnicalLevels: false;
};

/**
 * MOOX key-person BaZi doctrine.
 * It is a long-horizon corroboration source, never the primary asset direction.
 */
export const KEY_PERSON_BAZI_POLICY: KeyPersonBaziPolicy = {
  minHorizon: "MONTH",
  defaultWeightPct: 5,
  maxWeightPct: 10,
  unknownTimeMaxWeightPct: 5,
  mayOverrideAssetHexagram: false,
  mayVoteDailyDirection: false,
  maySetTechnicalLevels: false,
};

export function keyPersonBaziWeightPct(input: {
  dataQuality: KeyPersonBaziDataQuality;
  historicalBacktestComplete: boolean;
}): number {
  if (!input.historicalBacktestComplete) return 0;
  if (input.dataQuality === "VERIFIED_TIME") return KEY_PERSON_BAZI_POLICY.maxWeightPct;
  return KEY_PERSON_BAZI_POLICY.unknownTimeMaxWeightPct;
}

export function keyPersonBaziCanAffectHorizon(horizon: string): boolean {
  const normalized = horizon.trim().toUpperCase();
  return ["MONTH", "MONTH_1", "MONTH_3", "QUARTER", "YEAR", "YEAR_1", "YEAR_3", "YEAR_5", "YEAR_10"].includes(normalized);
}
