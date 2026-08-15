import "server-only";

import { getPublishedAiTradePlans } from "@/lib/trading-signals/ai-trade-plans";
import { buildMemberTradingPlan, isMemberPlanFormal } from "@/lib/trading-signals/member-trading-plan-core";
import type { AiTradePlan } from "@/types/ai-trade-plan";
import type { ChanMultiTimeframeFrame } from "@/types/chan-execution";
import type { MemberTradingPlan } from "@/types/member-trading-plan";

function normalizeRequestedSymbol(value: string): string {
  const symbol = value.trim().toUpperCase().replace(/[^A-Z0-9.\-]/g, "").slice(0, 20);
  return symbol && !symbol.endsWith("USDT") ? `${symbol}USDT` : symbol;
}

function planSymbolMatches(planSymbol: string, requested: string): boolean {
  return planSymbol.toUpperCase() === requested.toUpperCase();
}

function latestPlan(plans: readonly AiTradePlan[], symbol: string, nowMs: number): AiTradePlan | null {
  const modeRank = (mode: AiTradePlan["executionMode"]) => mode === "BITGET_DEMO" ? 3 : mode === "SHADOW" ? 2 : 1;
  const strategyRank = (strategy: AiTradePlan["strategyType"]) => strategy === "SWING" ? 3 : strategy === "POSITION" ? 2 : 1;
  return plans.filter((plan) => planSymbolMatches(plan.symbol, symbol)).sort((a, b) =>
    Number(isMemberPlanFormal(b, nowMs)) - Number(isMemberPlanFormal(a, nowMs)) ||
    modeRank(b.executionMode) - modeRank(a.executionMode) ||
    strategyRank(b.strategyType) - strategyRank(a.strategyType) ||
    b.version - a.version ||
    b.updatedAt.localeCompare(a.updatedAt)
  )[0] ?? null;
}

export async function loadCurrentMemberTradingPlan(input: {
  symbol: string;
  now?: Date;
}): Promise<MemberTradingPlan | null> {
  const symbol = normalizeRequestedSymbol(input.symbol);
  if (!symbol) return null;
  const now = input.now ?? new Date();
  const { loadMemberTradingInstruments } = await import("@/lib/trading-signals/member-instrument-registry.server");
  const registry = await loadMemberTradingInstruments(now);
  const executionInstrument = registry.instruments.find((row) => row.canonicalSymbol === symbol);
  if (!executionInstrument) return null;
  const plans = await getPublishedAiTradePlans(100, { readOnly: true });
  const sourcePlan = latestPlan(plans, symbol, now.getTime());
  if (!sourcePlan) return null;

  const [catalogModule, marketModule, structureModule, multiModule] = await Promise.all([
    import("@/lib/market-data/chan-instrument-catalog.server"),
    import("@/lib/market-data/chan-market-data"),
    import("@/lib/trading-signals/chan-structure-core"),
    import("@/lib/trading-signals/chan-multi-timeframe-core"),
  ]);
  const { resolveChanInstrument } = await import("@/lib/market-data/chan-instrument-catalog");
  const catalog = await catalogModule.loadChanInstrumentCatalog();
  const instrument = resolveChanInstrument(symbol, catalog.instruments);
  if (!instrument) return null;
  const capturedNowMs = now.getTime();
  const markets = await marketModule.loadChanTimeframes({
    symbol: instrument.symbol,
    instrument,
    capturedNowMs,
    timeoutMs: 4_500,
  });
  const frames: ChanMultiTimeframeFrame[] = markets.map((market) => ({
    timeframe: market.timeframe as ChanMultiTimeframeFrame["timeframe"],
    structure: structureModule.analyzeChanStructure(market.candles),
    error: market.error,
  }));
  const formal = isMemberPlanFormal(sourcePlan, capturedNowMs);
  const authority = formal ? sourcePlan.direction === "LONG" ? "BULL" : "BEAR" : "NEUTRAL";
  const chan = multiModule.decideChanMultiTimeframe({ authoritativeDirection: authority, frames });
  const latestCandle = markets.find((market) => market.timeframe === "30m")?.candles.at(-1);
  const candleMs = latestCandle
    ? latestCandle.timestamp < 1_000_000_000_000 ? latestCandle.timestamp * 1_000 : latestCandle.timestamp
    : Number.NaN;
  // Paper entry is blocked outside a fresh 30-minute market feed. A stored plan
  // quote is display context only and must not become a simulated fill price.
  const currentPrice = latestCandle && Number.isFinite(candleMs) && capturedNowMs >= candleMs && capturedNowMs - candleMs <= 2 * 60 * 60_000
    ? latestCandle.close
    : null;
  return buildMemberTradingPlan({
    plan: sourcePlan,
    chan,
    currentPrice: currentPrice != null && Number.isFinite(currentPrice) && currentPrice > 0 ? currentPrice : null,
    generatedAt: now.toISOString(),
    instrument: executionInstrument,
  });
}

/** Fresh trusted market price for risk-reducing Paper exits; independent of plan availability. */
export async function loadFreshMemberMarketPrice(input: {
  symbol: string;
  now?: Date;
}): Promise<number | null> {
  const symbol = normalizeRequestedSymbol(input.symbol);
  if (!symbol) return null;
  const now = input.now ?? new Date();
  const [catalogModule, marketModule] = await Promise.all([
    import("@/lib/market-data/chan-instrument-catalog.server"),
    import("@/lib/market-data/chan-market-data"),
  ]);
  const { resolveChanInstrument } = await import("@/lib/market-data/chan-instrument-catalog");
  const catalog = await catalogModule.loadChanInstrumentCatalog();
  const instrument = resolveChanInstrument(symbol, catalog.instruments);
  if (!instrument) return null;
  const market = (await marketModule.loadChanTimeframes({
    symbol: instrument.symbol,
    instrument,
    capturedNowMs: now.getTime(),
    timeoutMs: 4_500,
  })).find((row) => row.timeframe === "30m");
  const candle = market?.candles.at(-1);
  if (!candle) return null;
  const candleMs = candle.timestamp < 1_000_000_000_000 ? candle.timestamp * 1_000 : candle.timestamp;
  const age = now.getTime() - candleMs;
  return Number.isFinite(age) && age >= 0 && age <= 2 * 60 * 60_000 && candle.close > 0
    ? candle.close
    : null;
}
