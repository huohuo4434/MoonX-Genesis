/**
 * Multi-method forecast reference mix.
 * The percentages describe research influence, not statistical guarantees.
 */

export type ForecastBasisWeights = {
  technical: number;
  liuyao: number;
  cycle: number;
  qimen: number;
  macro: number;
  bazi: number;
};

export const DEFAULT_BASIS_WEIGHTS: ForecastBasisWeights = {
  technical: 35,
  liuyao: 30,
  cycle: 15,
  qimen: 10,
  macro: 5,
  bazi: 5,
};

/** Kept for backward compatibility with older call sites. */
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

/**
 * Daily cards use a stable baseline. Cycle-source opinions are time-decayed
 * before they enter the evidence set, so their 15% bucket cannot persist
 * after the source window expires.
 */
export function buildForecastBasisWeights(
  _legacyWavePercent: number = 5
): ForecastBasisWeights {
  return { ...DEFAULT_BASIS_WEIGHTS };
}

export const BASIS_LABELS: Array<{ key: keyof ForecastBasisWeights; label: string }> = [
  { key: "technical", label: "技术结构" },
  { key: "liuyao", label: "六爻方向" },
  { key: "cycle", label: "周期分析" },
  { key: "qimen", label: "奇门择时" },
  { key: "macro", label: "资金与消息" },
  { key: "bazi", label: "八字长期背景" },
];

/** Markets allowed to attach Wave evidence notes on tomorrow page. */
export const TOMORROW_WAVE_ALLOWED_SYMBOLS = new Set([
  "BTC",
  "BTCUSDT",
  "GOLD",
  "GC=F",
  "XAUUSD",
  "WTI",
  "CL",
  "CL=F",
]);

export function isTomorrowWaveAllowedSymbol(symbol: string): boolean {
  const s = symbol.trim().toUpperCase();
  return TOMORROW_WAVE_ALLOWED_SYMBOLS.has(s);
}
