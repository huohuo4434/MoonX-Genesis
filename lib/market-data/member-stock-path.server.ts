import "server-only";

import { loadChanCandles } from "@/lib/market-data/chan-market-data";
import { resolveIntradayTechnicalTarget } from "@/lib/market-data/intraday-chan-levels";
import { analyzeChanStructure } from "@/lib/trading-signals/chan-structure-core";
import { deriveChanStage } from "@/lib/trading-signals/chan-stage-core";
import type { MemberStockPathSnapshot } from "@/types/member-stock-picks-dashboard";

export async function loadMemberStockPathSnapshot(keyInput: string): Promise<MemberStockPathSnapshot> {
  const key = keyInput.trim().toUpperCase();
  const instrument = resolveIntradayTechnicalTarget(key);
  const capturedNowMs = Date.now();
  const capturedAt = new Date(capturedNowMs).toISOString();
  if (!instrument || instrument.market !== "US_EQUITY") {
    return { key, symbol: instrument?.symbol ?? key, capturedAt, dailyCandles: [], chan4h: null, error: "STOCK_CHART_UNAVAILABLE" };
  }

  const [daily, fourHour] = await Promise.all([
    loadChanCandles({ symbol: instrument.symbol, timeframe: "1D", instrument, timeoutMs: 4_500, capturedNowMs }),
    loadChanCandles({ symbol: instrument.symbol, timeframe: "4H", instrument, timeoutMs: 4_500, capturedNowMs }),
  ]);
  const stage = fourHour.candles.length ? deriveChanStage(analyzeChanStructure(fourHour.candles)) : null;
  const dailyCandles = daily.candles.slice(-36);
  return {
    key,
    symbol: instrument.symbol,
    capturedAt,
    dailyCandles,
    chan4h: stage ? {
      labelZh: stage.labelZh,
      direction: stage.direction,
      confirmation: stage.confirmation,
      invalidation: stage.invalidation,
      waitingFor: stage.waitingFor,
    } : null,
    error: dailyCandles.length ? null : daily.error ?? "DAILY_CANDLES_UNAVAILABLE",
  };
}
