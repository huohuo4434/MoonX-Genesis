import "server-only";
import { loadChanCandles } from "@/lib/market-data/chan-market-data";
import { marketMeta } from "@/lib/forecasts/weekly-to-daily";
import { reviewClosedTechnicalFrame, type TechnicalReview } from "./daily-technical-review-core";
import type { ChanInstrument } from "@/types/chan-execution";

/** Read-only: retain per-frame crypto provenance; never substitute an ETF for an index. */
export async function loadDailyTechnicalReview(marketCode: string, cutoffMs: number): Promise<{ frames: TechnicalReview[]; quoteLabel: string }> {
  const meta = marketMeta(marketCode);
  const crypto = meta.legacyMarket === "crypto";
  const symbol = crypto ? `${marketCode}USDT` : meta.quoteSymbol;
  const instrument: ChanInstrument = { symbol, label: meta.assetName, formalPlanSymbol: marketCode,
    provider: crypto ? "BITGET_PUBLIC" : "YAHOO_CHART", providerSymbol: symbol,
    market: crypto ? "CRYPTO" : "INDEX_COMMODITY" };
  const frames = await Promise.all((["1D", "4H", "1H"] as const).map(async (timeframe) => {
    const loaded = await loadChanCandles({ symbol, timeframe, instrument, capturedNowMs: cutoffMs, timeoutMs: 2500 });
    const review = reviewClosedTechnicalFrame({ timeframe, candles: loaded.error ? [] : loaded.candles, cutoffMs,
      maxAgeMs: crypto ? (timeframe === "1D" ? 48 : timeframe === "4H" ? 12 : 3) * 3600_000 : 4 * 86400_000 });
    return { ...review, reason: `${review.reason}；行情源：${!review.available ? "无有效数据" : crypto ? loaded.provenance?.selectedProvider ?? "BITGET_FUTURES" : `YAHOO ${symbol}`}` };
  }));
  return { frames, quoteLabel: `${symbol}${crypto ? "，多源现货/合约参考，各周期来源见详情" : "，原标的行情"}` };
}
