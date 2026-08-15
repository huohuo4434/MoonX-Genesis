import { analyzeChanStructure } from "@/lib/trading-signals/chan-structure-core";
import { deriveChanStage } from "@/lib/trading-signals/chan-stage-core";
import { filterClosedFocusDailyBars, focusDailyChanCapability, type FocusClosedDailyBar, type FocusDailyAuxiliaryEvidence } from "@/lib/data/conviction/focus-daily-generation-core";

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
