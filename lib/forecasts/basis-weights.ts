/**
 * Tomorrow-page evidence mix. Wave starts at 5% and only rises near key levels.
 * Rules: ≤5%→8, ≤3%→12, ≤1.5%→15, ≤0.5% (confirm zone)→20; else 5. Cap 20.
 */

export type ForecastBasisWeights = {
  ai: number;
  liuyao: number;
  technical: number;
  wave: number;
  macro: number;
};

export const DEFAULT_BASIS_WEIGHTS: ForecastBasisWeights = {
  ai: 35,
  liuyao: 25,
  technical: 20,
  wave: 5,
  macro: 15,
};

/** Distance to Wave key level as % of price → Wave module weight (max 20). */
export function waveBasisPercentFromProximity(
  distancePct: number | null | undefined
): number {
  if (distancePct == null || !Number.isFinite(distancePct)) return 5;
  if (distancePct <= 0.5) return 20;
  if (distancePct <= 1.5) return 15;
  if (distancePct <= 3) return 12;
  if (distancePct <= 5) return 8;
  return 5;
}

export function buildForecastBasisWeights(
  wavePercent: number = DEFAULT_BASIS_WEIGHTS.wave
): ForecastBasisWeights {
  const wave = Math.min(20, Math.max(5, Math.round(wavePercent)));
  const delta = wave - DEFAULT_BASIS_WEIGHTS.wave;

  let ai = DEFAULT_BASIS_WEIGHTS.ai - Math.round(delta * 0.5);
  let technical = DEFAULT_BASIS_WEIGHTS.technical - Math.round(delta * 0.3);
  let macro = DEFAULT_BASIS_WEIGHTS.macro - Math.round(delta * 0.2);
  const liuyao = DEFAULT_BASIS_WEIGHTS.liuyao;

  ai = Math.max(22, Math.min(40, ai));
  technical = Math.max(10, Math.min(25, technical));
  macro = Math.max(8, Math.min(20, macro));

  let sum = ai + liuyao + technical + wave + macro;
  if (sum !== 100) {
    ai = Math.max(20, ai + (100 - sum));
    sum = ai + liuyao + technical + wave + macro;
  }

  return { ai, liuyao, technical, wave, macro };
}

export const BASIS_LABELS: Array<{ key: keyof ForecastBasisWeights; label: string }> = [
  { key: "ai", label: "AI模型" },
  { key: "liuyao", label: "六爻模型" },
  { key: "technical", label: "技术结构" },
  { key: "macro", label: "资金与宏观" },
  { key: "wave", label: "波浪分析" },
];

/** Markets allowed to attach Wave evidence notes on tomorrow page. */
export const TOMORROW_WAVE_ALLOWED_SYMBOLS = new Set([
  "BTC",
  "BTCUSDT",
  "GLD",
  "XAUUSD",
  "WTI",
  "CL",
  "CL=F",
]);

export function isTomorrowWaveAllowedSymbol(symbol: string): boolean {
  const s = symbol.trim().toUpperCase();
  return TOMORROW_WAVE_ALLOWED_SYMBOLS.has(s);
}
