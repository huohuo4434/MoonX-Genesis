import { filterClosedFocusDailyBars, type FocusClosedDailyBar, type FocusDailyAuxiliaryEvidence } from "@/lib/data/conviction/focus-daily-generation-core";

export type FocusDailyAuxiliaryDependencies = {
  loadBars: (() => Promise<readonly FocusClosedDailyBar[]>) | null;
  loadXMentions24h: () => Promise<number | null>;
};

function roundPct(value: number | null): number | null {
  return value == null || !Number.isFinite(value) ? null : Math.round(value * 10_000) / 100;
}

function validBars(bars: readonly FocusClosedDailyBar[]): FocusClosedDailyBar[] {
  return bars.filter((bar) => !bar.synthetic)
    .filter((bar) => [bar.open, bar.high, bar.low, bar.close].every((value) => Number.isFinite(value) && value > 0))
    .filter((bar) => bar.high >= Math.max(bar.open, bar.close) && bar.low <= Math.min(bar.open, bar.close))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function buildFocusUnavailableAuxiliaryEvidence(input: {
  symbol: string;
  reason: "QUOTE_MAPPING_UNAVAILABLE" | "MARKET_DATA_UNAVAILABLE";
  xMentions24h: number | null;
}): FocusDailyAuxiliaryEvidence {
  return {
    evidenceKey: JSON.stringify({ symbol: input.symbol.trim().toUpperCase(), marketDataStatus: "UNAVAILABLE", xMentions24h: input.xMentions24h }),
    supportLevels: [],
    resistanceLevels: [],
    technicalEvidence: null,
    newsEvidence: input.xMentions24h == null ? null : `X情报近24小时提及${input.xMentions24h}次。`,
    realizedPhase: "NONE",
    marketDataStatus: "UNAVAILABLE",
    chanStatus: "UNAVAILABLE",
    chanTimeframes: [],
    chanStage: null,
    sessionMovePct: null,
    recentMovePct: null,
    currentPrice: null,
    previousClose: null,
  };
}

export async function resolveFocusDailyAuxiliaryEvidence(input: {
  symbol: string;
  quoteSymbol: string | null;
  asOfDate: string;
  dependencies: FocusDailyAuxiliaryDependencies;
}): Promise<FocusDailyAuxiliaryEvidence> {
  const xMentions24h = await input.dependencies.loadXMentions24h().catch(() => null);
  if (!input.quoteSymbol || !input.dependencies.loadBars) {
    return buildFocusUnavailableAuxiliaryEvidence({ symbol: input.symbol, reason: "QUOTE_MAPPING_UNAVAILABLE", xMentions24h });
  }
  try {
    const bars = await input.dependencies.loadBars();
    return buildFocusClosedMarketAuxiliaryEvidence({ symbol: input.symbol, quoteSymbol: input.quoteSymbol, asOfDate: input.asOfDate, bars, xMentions24h });
  } catch {
    return buildFocusUnavailableAuxiliaryEvidence({ symbol: input.symbol, reason: "MARKET_DATA_UNAVAILABLE", xMentions24h });
  }
}

export function buildFocusClosedMarketAuxiliaryEvidence(input: {
  symbol: string;
  quoteSymbol: string;
  asOfDate: string;
  bars: readonly FocusClosedDailyBar[];
  xMentions24h: number | null;
}): FocusDailyAuxiliaryEvidence {
  const all = validBars(input.bars);
  const closed = filterClosedFocusDailyBars(all, input.asOfDate);
  if (closed.length < 2) throw new Error("focus-market-evidence-insufficient");

  const recent = closed.slice(-5);
  const first = recent[0]!;
  const lastClosed = recent.at(-1)!;
  const current = all.filter((bar) => bar.date === input.asOfDate).at(-1) ?? null;
  const recentMove = (lastClosed.close - first.open) / first.open;
  const sessionMove = current ? (current.close - lastClosed.close) / lastClosed.close : null;
  const realizedPhase = (sessionMove != null && sessionMove >= 0.025) || recentMove >= 0.04
    ? "EARLY_RALLY"
    : (sessionMove != null && sessionMove <= -0.025) || recentMove <= -0.04
      ? "EARLY_DROP"
      : "NONE";

  const sessionPct = roundPct(sessionMove);
  const recentPct = roundPct(recentMove);
  const technicalParts = [
    current && sessionPct != null ? `今日${sessionPct >= 0 ? "+" : ""}${sessionPct}%` : null,
    recentPct != null ? `近5日${recentPct >= 0 ? "+" : ""}${recentPct}%` : null,
  ].filter((value): value is string => Boolean(value));

  return {
    evidenceKey: JSON.stringify({ quoteSymbol: input.quoteSymbol, lastClosed, current, xMentions24h: input.xMentions24h, realizedPhase }),
    supportLevels: [],
    resistanceLevels: [],
    technicalEvidence: technicalParts.join("；"),
    newsEvidence: input.xMentions24h == null ? null : `X情报近24小时提及${input.xMentions24h}次。`,
    realizedPhase,
    marketDataStatus: "AVAILABLE",
    chanStatus: "UNAVAILABLE",
    chanTimeframes: [],
    chanStage: null,
    sessionMovePct: sessionPct,
    recentMovePct: recentPct,
    currentPrice: current?.close ?? lastClosed.close,
    previousClose: lastClosed.close,
  };
}
