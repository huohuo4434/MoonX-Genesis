import "server-only";

import type { DailyAccuracyMarket } from "@/types/daily-accuracy";
import { fetchRecentDailyBarsForForecast } from "@/lib/market-data/daily-prices";
import { findXIntelligenceSummaryForMarket } from "@/lib/trading-signals/x-intelligence-overlay";
import { getXIntelligenceSnapshot } from "@/lib/trading-signals/x-intelligence-summary";
import { filterClosedFocusDailyBars, type FocusDailyAuxiliaryEvidence } from "@/lib/data/conviction/focus-daily-generation-core";

function marketIdentity(input: { symbol: string; assetType?: string; exchange?: string | null }): { market: DailyAccuracyMarket; quoteSymbol: string } | null {
  const symbol = input.symbol.trim().toUpperCase();
  if (!symbol || symbol === "ASTEROID") return null;
  if (input.assetType === "CRYPTO") return { market: "CRYPTO", quoteSymbol: `${symbol}-USD` };
  if (/香港/.test(input.exchange ?? "")) return { market: "HK", quoteSymbol: `${symbol.padStart(4, "0")}.HK` };
  if (/上海/.test(input.exchange ?? "")) return { market: "CN", quoteSymbol: `${symbol}.SS` };
  if (/深圳/.test(input.exchange ?? "")) return { market: "CN", quoteSymbol: `${symbol}.SZ` };
  return { market: "US", quoteSymbol: symbol };
}

export async function loadFocusDailyAuxiliaryEvidence(input: {
  symbol: string;
  assetType?: string;
  exchange?: string | null;
  asOfDate: string;
  now: Date;
}): Promise<FocusDailyAuxiliaryEvidence> {
  const snapshot = await getXIntelligenceSnapshot({ now: input.now });
  if (!snapshot.databaseAvailable) throw new Error("focus-x-intelligence-unavailable");
  const xSummary = findXIntelligenceSummaryForMarket(snapshot.aggregate.summaries, input.symbol);
  const identity = marketIdentity(input);
  if (!identity) {
    return {
      evidenceKey: JSON.stringify({ xSummary, market: "UNMAPPED" }),
      supportLevels: [],
      resistanceLevels: [],
      technicalEvidence: "该标的暂无经过验证的公共行情代码映射；不生成技术点位。",
      newsEvidence: xSummary ? `X聚合提及${xSummary.mentions24h}次，仅作研究辅助，不改变正式周方向。` : "X聚合暂无该标的明确观点。",
    };
  }
  const bars = filterClosedFocusDailyBars(
    await fetchRecentDailyBarsForForecast({ quoteSymbol: identity.quoteSymbol, market: identity.market, asOfDate: input.asOfDate }),
    input.asOfDate
  );
  if (bars.length < 2) throw new Error("focus-closed-market-evidence-insufficient");
  const recent = bars.slice(-5);
  const last = recent.at(-1)!;
  const support = Math.min(...recent.map((bar) => bar.low));
  const resistance = Math.max(...recent.map((bar) => bar.high));
  return {
    evidenceKey: JSON.stringify({ quoteSymbol: identity.quoteSymbol, last, support, resistance, xSummary }),
    supportLevels: [String(support)],
    resistanceLevels: [String(resistance)],
    technicalEvidence: `真实闭合日K截至${last.date}；仅记录区间参考，不改变正式周方向。`,
    newsEvidence: xSummary ? `X聚合提及${xSummary.mentions24h}次，仅作研究辅助，不改变正式周方向。` : "X聚合暂无该标的明确观点。",
  };
}
