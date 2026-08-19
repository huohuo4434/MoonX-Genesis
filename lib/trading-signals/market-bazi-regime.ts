export type MarketBaziDirection = "LONG" | "SHORT" | "NEUTRAL";
export type MarketBaziHorizon = "INTRADAY" | "SWING" | "POSITION";

export type MarketBaziRegimePrior = {
  symbol: "BTCUSDT";
  direction: Exclude<MarketBaziDirection, "NEUTRAL">;
  confidence: number;
  weightPct: number;
  start: string;
  end: string;
  theory: "ASSET_BAZI_MONTHLY_REGIME";
  sourceLabel: "研究者·资产八字";
  sourceSummary: string;
  timingNote: string;
  countertrendEligible: true;
  countertrendRiskScale: number;
  canFlipOfficialQimenDirectionAlone: false;
};

type WindowDefinition = Omit<MarketBaziRegimePrior, "weightPct"> & {
  weightByHorizon: Record<MarketBaziHorizon, number>;
};

/**
 * Forward-locked BTC asset-Bazi regime notes distilled from the user supplied
 * Datou materials. This is intentionally a regime prior, not a daily oracle:
 * - late Jul through Sep: rebound channel; Aug/Sep constructive;
 * - 73k first checkpoint and ~84k is an indicative technical objective, not a guarantee;
 * - Oct: another pullback window was explicitly anticipated.
 *
 * The Aug breakout timing was late versus the source's "next week" wording,
 * so confidence stays capped and the prior may never flip the official Qimen
 * direction by itself. It may only reduce conviction or authorize a small
 * countertrend probe after 4H/30m/5m confirmation.
 */
const BTC_WINDOWS: WindowDefinition[] = [
  {
    symbol: "BTCUSDT",
    direction: "LONG",
    confidence: 62,
    start: "2026-07-31",
    end: "2026-09-30",
    theory: "ASSET_BAZI_MONTHLY_REGIME",
    sourceLabel: "研究者·资产八字",
    sourceSummary: "资产八字月令先验：7月底起至8—9月偏反弹；8月突破区间的方向判断后来兑现，但具体时间晚于原窗口。",
    timingNote: "方向/阶段有效，具体突破时间按‘延迟兑现’处理，不给满权重。",
    countertrendEligible: true,
    countertrendRiskScale: 0.35,
    canFlipOfficialQimenDirectionAlone: false,
    weightByHorizon: { INTRADAY: 8, SWING: 15, POSITION: 18 },
  },
  {
    symbol: "BTCUSDT",
    direction: "SHORT",
    confidence: 57,
    start: "2026-10-01",
    end: "2026-10-31",
    theory: "ASSET_BAZI_MONTHLY_REGIME",
    sourceLabel: "研究者·资产八字",
    sourceSummary: "资产八字月令先验：8—9月反弹后，10月存在再次回落窗口。",
    timingNote: "仅作月度路径先验，必须等待价格结构确认。",
    countertrendEligible: true,
    countertrendRiskScale: 0.3,
    canFlipOfficialQimenDirectionAlone: false,
    weightByHorizon: { INTRADAY: 6, SWING: 12, POSITION: 16 },
  },
];

function dayKey(now: Date): string {
  return now.toISOString().slice(0, 10);
}

export function getMarketBaziRegimePrior(
  symbol: string,
  strategyType: MarketBaziHorizon,
  now = new Date(),
): MarketBaziRegimePrior | null {
  const normalized = symbol.trim().toUpperCase();
  if (normalized !== "BTCUSDT" && normalized !== "BTC") return null;
  const key = dayKey(now);
  const row = BTC_WINDOWS.find((item) => key >= item.start && key <= item.end);
  if (!row) return null;
  return {
    symbol: "BTCUSDT",
    direction: row.direction,
    confidence: row.confidence,
    weightPct: row.weightByHorizon[strategyType],
    start: row.start,
    end: row.end,
    theory: row.theory,
    sourceLabel: row.sourceLabel,
    sourceSummary: row.sourceSummary,
    timingNote: row.timingNote,
    countertrendEligible: true,
    countertrendRiskScale: row.countertrendRiskScale,
    canFlipOfficialQimenDirectionAlone: false,
  };
}

export function getDailyMarketBaziRegime(asset: string, dateKey: string) {
  const normalized = asset.trim().toUpperCase();
  if (normalized !== "BTC" && normalized !== "BTCUSDT" && normalized !== "BITCOIN") return null;
  const row = BTC_WINDOWS.find((item) => dateKey >= item.start && dateKey <= item.end);
  if (!row) return null;
  return {
    direction: row.direction === "LONG" ? "UP" as const : "DOWN" as const,
    confidence: row.confidence,
    weightPct: row.weightByHorizon.INTRADAY,
    sourceLabel: row.sourceLabel,
    sourceSummary: row.sourceSummary,
    timingNote: row.timingNote,
    canOverrideQimen: false as const,
  };
}
