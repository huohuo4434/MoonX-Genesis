import { analyzeChanStructure } from "@/lib/trading-signals/chan-structure-core";
import { deriveChanStage } from "@/lib/trading-signals/chan-stage-core";
import { filterClosedFocusDailyBars, focusDailyChanCapability, type FocusClosedDailyBar, type FocusDailyAuxiliaryEvidence } from "@/lib/data/conviction/focus-daily-generation-core";

export type FocusDailyAuxiliaryDependencies = {
  loadBars: (() => Promise<readonly FocusClosedDailyBar[]>) | null;
  loadXMentions24h: () => Promise<number | null>;
};

export function buildFocusUnavailableAuxiliaryEvidence(input: {
  symbol: string;
  reason: "QUOTE_MAPPING_UNAVAILABLE" | "MARKET_DATA_UNAVAILABLE";
  xMentions24h: number | null;
}): FocusDailyAuxiliaryEvidence {
  return {
    evidenceKey: JSON.stringify({
      symbol: input.symbol.trim().toUpperCase(),
      marketDataStatus: "UNAVAILABLE",
      xMentions24h: input.xMentions24h,
    }),
    supportLevels: [],
    resistanceLevels: [],
    technicalEvidence: `${input.reason}：行情辅助资料暂不可用；正式锁定周方向仍可用于今日及未来日节奏推演。`,
    newsEvidence: input.xMentions24h == null
      ? "市场情报辅助当前不可用；不影响正式锁定周方向，也不会据此补造新闻结论。"
      : `市场情报聚合提及${input.xMentions24h}次，仅辅助日节奏，不改变正式锁定周方向。`,
    realizedPhase: "NONE",
    marketDataStatus: "UNAVAILABLE",
    chanStatus: "UNAVAILABLE",
    chanTimeframes: [],
    chanStage: null,
  };
}

/**
 * Formal weekly evidence is the authority for Focus daily decomposition.
 * Market/X/Chan inputs are optional enrichments: their outage must not erase an
 * otherwise valid current/future path, but every unavailable input stays explicit.
 */
export async function resolveFocusDailyAuxiliaryEvidence(input: {
  symbol: string;
  quoteSymbol: string | null;
  asOfDate: string;
  dependencies: FocusDailyAuxiliaryDependencies;
}): Promise<FocusDailyAuxiliaryEvidence> {
  const xMentions24h = await input.dependencies.loadXMentions24h().catch(() => null);
  if (!input.quoteSymbol || !input.dependencies.loadBars) {
    return buildFocusUnavailableAuxiliaryEvidence({
      symbol: input.symbol,
      reason: "QUOTE_MAPPING_UNAVAILABLE",
      xMentions24h,
    });
  }
  try {
    const bars = await input.dependencies.loadBars();
    return buildFocusClosedMarketAuxiliaryEvidence({
      symbol: input.symbol,
      quoteSymbol: input.quoteSymbol,
      asOfDate: input.asOfDate,
      bars,
      xMentions24h,
    });
  } catch {
    return buildFocusUnavailableAuxiliaryEvidence({
      symbol: input.symbol,
      reason: "MARKET_DATA_UNAVAILABLE",
      xMentions24h,
    });
  }
}

export function buildFocusClosedMarketAuxiliaryEvidence(input: {
  symbol: string;
  quoteSymbol: string;
  asOfDate: string;
  bars: readonly FocusClosedDailyBar[];
  xMentions24h: number | null;
}): FocusDailyAuxiliaryEvidence {
  const bars = filterClosedFocusDailyBars(input.bars, input.asOfDate);
  if (bars.length < 2) throw new Error("focus-closed-market-evidence-insufficient");
  const recent = bars.slice(-5), first = recent[0]!, last = recent.at(-1)!;
  const support = Math.min(...recent.map((bar) => bar.low));
  const resistance = Math.max(...recent.map((bar) => bar.high));
  const move = (last.close - first.open) / first.open;
  const realizedPhase = move >= 0.04 ? "EARLY_RALLY" : move <= -0.04 ? "EARLY_DROP" : "NONE";
  const chanCapability = focusDailyChanCapability(input.symbol);
  const chanStructure = chanCapability.catalogSupported
    ? analyzeChanStructure(bars.map((bar) => ({ timestamp: Date.parse(`${bar.date}T00:00:00Z`), open: bar.open, high: bar.high, low: bar.low, close: bar.close, volume: null })))
    : null;
  const chanStage = chanStructure ? deriveChanStage(chanStructure) : null;
  return {
    evidenceKey: JSON.stringify({ quoteSymbol: input.quoteSymbol, last, support, resistance, xMentions24h: input.xMentions24h, realizedPhase, chanStage: chanStage?.code ?? null }),
    supportLevels: [String(support)],
    resistanceLevels: [String(resistance)],
    technicalEvidence: `真实闭合日K截至${last.date}；只用于路径进度和区间参考，不改变正式锁定周方向。`,
    newsEvidence: input.xMentions24h == null ? "市场情报当前无明确观点。" : `市场情报聚合提及${input.xMentions24h}次，仅辅助日节奏，不改变正式锁定周方向。`,
    realizedPhase,
    marketDataStatus: "AVAILABLE",
    chanStatus: chanCapability.catalogSupported ? "AVAILABLE" : "UNAVAILABLE",
    chanTimeframes: chanCapability.analyzedTimeframes,
    chanStage: chanStage ? `1D:${chanStage.code}` : null,
  };
}
