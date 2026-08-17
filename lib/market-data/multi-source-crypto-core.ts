import { intervalMs, isValidChanCandle } from "@/lib/market-data/chan-market-data-core";
import type { ChanCandle, ChanTimeframe } from "@/types/chan-execution";
import type {
  CryptoMarketProvider,
  CryptoSourceSnapshot,
  MarketDataQuality,
  MicrostructureAssessment,
  MicrostructureMetrics,
  MultiSourceCryptoCandles,
} from "@/types/market-microstructure";

export type ProviderCandidate = {
  provider: CryptoMarketProvider;
  candles: ChanCandle[];
  latencyMs: number;
  errorCode: string | null;
};

function finiteNumber(value: unknown): number | null {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function sortedUniqueCandles(rows: ChanCandle[]): ChanCandle[] {
  const byTimestamp = new Map<number, ChanCandle>();
  for (const row of rows) {
    if (isValidChanCandle(row)) byTimestamp.set(row.timestamp, row);
  }
  return [...byTimestamp.values()].sort((a, b) => a.timestamp - b.timestamp);
}

export function parseBinanceKlines(
  payload: unknown,
  timeframe: ChanTimeframe,
  capturedNowMs: number
): ChanCandle[] {
  if (!Array.isArray(payload)) return [];
  const duration = intervalMs(timeframe);
  const rows = payload.flatMap((item): ChanCandle[] => {
    if (!Array.isArray(item)) return [];
    const timestamp = finiteNumber(item[0]);
    const open = finiteNumber(item[1]);
    const high = finiteNumber(item[2]);
    const low = finiteNumber(item[3]);
    const close = finiteNumber(item[4]);
    const volume = finiteNumber(item[5]);
    const closeTime = finiteNumber(item[6]);
    if (timestamp == null || open == null || high == null || low == null || close == null) return [];
    const closedAt = closeTime ?? timestamp + duration;
    if (closedAt > capturedNowMs) return [];
    return [{ timestamp, open, high, low, close, volume }];
  });
  return sortedUniqueCandles(rows);
}

export function parseOkxCandles(
  payload: unknown,
  timeframe: ChanTimeframe,
  capturedNowMs: number
): ChanCandle[] {
  const envelope = payload as { code?: string; data?: unknown[] };
  if (envelope?.code !== "0" || !Array.isArray(envelope.data)) return [];
  const duration = intervalMs(timeframe);
  const rows = envelope.data.flatMap((item): ChanCandle[] => {
    if (!Array.isArray(item)) return [];
    const timestamp = finiteNumber(item[0]);
    const open = finiteNumber(item[1]);
    const high = finiteNumber(item[2]);
    const low = finiteNumber(item[3]);
    const close = finiteNumber(item[4]);
    const volume = finiteNumber(item[5]);
    const confirm = String(item[8] ?? "");
    if (timestamp == null || open == null || high == null || low == null || close == null) return [];
    if (confirm && confirm !== "1") return [];
    if (timestamp + duration > capturedNowMs) return [];
    return [{ timestamp, open, high, low, close, volume }];
  });
  return sortedUniqueCandles(rows);
}

export function parseBitgetCandles(
  payload: unknown,
  timeframe: ChanTimeframe,
  capturedNowMs: number
): ChanCandle[] {
  const envelope = payload as { code?: string; data?: unknown[] };
  if (envelope?.code !== "00000" || !Array.isArray(envelope.data)) return [];
  const duration = intervalMs(timeframe);
  const rows = envelope.data.flatMap((item): ChanCandle[] => {
    if (!Array.isArray(item)) return [];
    const timestamp = finiteNumber(item[0]);
    const open = finiteNumber(item[1]);
    const high = finiteNumber(item[2]);
    const low = finiteNumber(item[3]);
    const close = finiteNumber(item[4]);
    const volume = finiteNumber(item[5]);
    if (timestamp == null || open == null || high == null || low == null || close == null) return [];
    if (timestamp + duration > capturedNowMs) return [];
    return [{ timestamp, open, high, low, close, volume }];
  });
  return sortedUniqueCandles(rows);
}

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1]! + sorted[middle]!) / 2
    : sorted[middle]!;
}

function staleLimitMs(timeframe: ChanTimeframe): number {
  const duration = intervalMs(timeframe);
  return Math.max(duration * 2.5, timeframe === "1D" ? 36 * 60 * 60 * 1000 : 20 * 60 * 1000);
}

function sourceSnapshot(
  candidate: ProviderCandidate,
  timeframe: ChanTimeframe,
  capturedNowMs: number
): CryptoSourceSnapshot {
  const latest = candidate.candles.at(-1) ?? null;
  const stale = latest == null || capturedNowMs - (latest.timestamp + intervalMs(timeframe)) > staleLimitMs(timeframe);
  const enough = candidate.candles.length >= Math.min(30, timeframe === "1D" ? 20 : 30);
  const status = candidate.errorCode || !latest
    ? "FAILED" as const
    : stale || !enough
      ? "DEGRADED" as const
      : "HEALTHY" as const;
  return {
    provider: candidate.provider,
    status,
    candleCount: candidate.candles.length,
    latestClosedAt: latest ? new Date(latest.timestamp + intervalMs(timeframe)).toISOString() : null,
    latestPrice: latest?.close ?? null,
    latencyMs: candidate.latencyMs,
    stale,
    errorCode: candidate.errorCode,
  };
}

export function selectMultiSourceCandles(input: {
  symbol: string;
  timeframe: ChanTimeframe;
  candidates: ProviderCandidate[];
  capturedNowMs: number;
}): MultiSourceCryptoCandles {
  const preference: CryptoMarketProvider[] = ["BINANCE_SPOT", "OKX_SPOT", "BITGET_FUTURES"];
  const snapshots = input.candidates.map((candidate) => sourceSnapshot(candidate, input.timeframe, input.capturedNowMs));
  const healthyPrices = snapshots
    .filter((source) => source.status !== "FAILED" && source.latestPrice != null)
    .map((source) => source.latestPrice!);
  const consensusPrice = median(healthyPrices);
  const divergencePct = consensusPrice && healthyPrices.length > 1
    ? Math.max(...healthyPrices.map((price) => Math.abs(price - consensusPrice) / consensusPrice * 100))
    : healthyPrices.length === 1
      ? 0
      : null;

  const selected = preference
    .map((provider) => input.candidates.find((candidate) => candidate.provider === provider))
    .find((candidate) => {
      if (!candidate) return false;
      const snapshot = snapshots.find((source) => source.provider === candidate.provider);
      return snapshot?.status === "HEALTHY" && candidate.candles.length > 0;
    }) ?? preference
      .map((provider) => input.candidates.find((candidate) => candidate.provider === provider))
      .find((candidate) => candidate && candidate.candles.length > 0) ?? null;

  let quality: MarketDataQuality = "BLOCKED";
  if (selected && healthyPrices.length >= 2 && divergencePct != null && divergencePct <= 0.45) quality = "GOOD";
  else if (selected && healthyPrices.length >= 1 && (divergencePct == null || divergencePct <= 1.25)) quality = "DEGRADED";

  const precisionLevelsAllowed = Boolean(selected)
    && healthyPrices.length >= 2
    && quality !== "BLOCKED"
    && (divergencePct == null || divergencePct <= 0.75);
  return {
    symbol: input.symbol,
    timeframe: input.timeframe,
    candles: selected?.candles ?? [],
    provenance: {
      symbol: input.symbol,
      timeframe: input.timeframe,
      selectedProvider: selected?.provider ?? null,
      capturedAt: new Date(input.capturedNowMs).toISOString(),
      sourceCount: snapshots.filter((source) => source.status !== "FAILED").length,
      consensusPrice,
      divergencePct: divergencePct == null ? null : Number(divergencePct.toFixed(4)),
      quality,
      precisionLevelsAllowed,
      closedCandlesOnly: true,
      sources: snapshots,
    },
    error: selected ? null : "MULTI_SOURCE_MARKET_DATA_UNAVAILABLE",
  };
}

function percentChange(first: number | null, last: number | null): number | null {
  if (first == null || last == null || first === 0) return null;
  return (last - first) / Math.abs(first) * 100;
}

export function buildMicrostructureMetrics(input: {
  spotPrice?: unknown;
  futuresPrice?: unknown;
  markPrice?: unknown;
  indexPrice?: unknown;
  fundingRate?: unknown;
  nextFundingTime?: unknown;
  openInterest?: unknown;
  openInterestValue?: unknown;
  openInterestFirst?: unknown;
  openInterestLast?: unknown;
  longShortRatio?: unknown;
  longAccount?: unknown;
  shortAccount?: unknown;
  takerBuySellRatio?: unknown;
  priceFirst?: unknown;
  priceLast?: unknown;
}): MicrostructureMetrics {
  const spotPrice = finiteNumber(input.spotPrice);
  const futuresPrice = finiteNumber(input.futuresPrice);
  const markPrice = finiteNumber(input.markPrice);
  const indexPrice = finiteNumber(input.indexPrice);
  const fundingRate = finiteNumber(input.fundingRate);
  const nextFundingTime = finiteNumber(input.nextFundingTime);
  const openInterest = finiteNumber(input.openInterest);
  const openInterestValue = finiteNumber(input.openInterestValue);
  const longAccount = finiteNumber(input.longAccount);
  const shortAccount = finiteNumber(input.shortAccount);
  return {
    spotPrice,
    futuresPrice,
    markPrice,
    indexPrice,
    basisPct: spotPrice && (markPrice ?? futuresPrice)
      ? ((markPrice ?? futuresPrice)! - spotPrice) / spotPrice * 100
      : null,
    fundingRate,
    fundingRateBps: fundingRate == null ? null : fundingRate * 10_000,
    nextFundingAt: nextFundingTime == null ? null : new Date(nextFundingTime).toISOString(),
    openInterest,
    openInterestValue,
    openInterestChangePct: percentChange(finiteNumber(input.openInterestFirst), finiteNumber(input.openInterestLast)),
    globalLongShortRatio: finiteNumber(input.longShortRatio),
    longAccountPct: longAccount == null ? null : longAccount * 100,
    shortAccountPct: shortAccount == null ? null : shortAccount * 100,
    takerBuySellRatio: finiteNumber(input.takerBuySellRatio),
    priceChangePct: percentChange(finiteNumber(input.priceFirst), finiteNumber(input.priceLast)),
  };
}

export function assessMicrostructure(metrics: MicrostructureMetrics): MicrostructureAssessment {
  const riskFlags: string[] = [];
  let score = 0;
  const funding = metrics.fundingRate ?? 0;
  const ratio = metrics.globalLongShortRatio;
  const taker = metrics.takerBuySellRatio;
  const oiChange = metrics.openInterestChangePct;
  const priceChange = metrics.priceChangePct;

  if (taker != null) {
    if (taker >= 1.08) score += 2;
    else if (taker <= 0.92) score -= 2;
  }
  if (priceChange != null) score += priceChange > 0.4 ? 1 : priceChange < -0.4 ? -1 : 0;
  if (oiChange != null && Math.abs(oiChange) >= 2) {
    riskFlags.push(oiChange > 0 ? "LEVERAGE_BUILDUP" : "DELEVERAGING");
    if (oiChange < 0) score = Math.trunc(score / 2);
  }
  if (funding >= 0.0005) riskFlags.push("FUNDING_POSITIVE_EXTREME");
  if (funding <= -0.0005) riskFlags.push("FUNDING_NEGATIVE_EXTREME");
  if (ratio != null && ratio >= 1.8) riskFlags.push("LONG_CROWDING");
  if (ratio != null && ratio <= 0.65) riskFlags.push("SHORT_CROWDING");
  if (metrics.basisPct != null && Math.abs(metrics.basisPct) >= 0.8) riskFlags.push("BASIS_EXTREME");

  const longCrowded = riskFlags.includes("LONG_CROWDING") && funding > 0;
  const shortCrowded = riskFlags.includes("SHORT_CROWDING") && funding < 0;
  const deleveraging = riskFlags.includes("DELEVERAGING");

  if (longCrowded) {
    return {
      state: "LONG_CROWDING",
      labelZh: "多头拥挤",
      summaryZh: "资金费率和多空比显示多头较拥挤，方向即使偏多也不适合追涨。",
      executionStatusZh: "降低追涨冲动，等待回踩和结构确认",
      riskFlags,
      score,
      authority: "EXECUTION_ONLY",
      canOverrideFormalDirection: false,
    };
  }
  if (shortCrowded) {
    return {
      state: "SHORT_CROWDING",
      labelZh: "空头拥挤",
      summaryZh: "空头仓位较集中，继续看弱时也要防止快速反抽。",
      executionStatusZh: "不追空，等待反抽后的确认位置",
      riskFlags,
      score,
      authority: "EXECUTION_ONLY",
      canOverrideFormalDirection: false,
    };
  }
  if (deleveraging) {
    return {
      state: "DELEVERAGING",
      labelZh: "去杠杆中",
      summaryZh: "持仓量下降，当前波动可能主要来自平仓和去杠杆，先等结构稳定。",
      executionStatusZh: "等待，不用短线波动反向修改正式方向",
      riskFlags,
      score,
      authority: "EXECUTION_ONLY",
      canOverrideFormalDirection: false,
    };
  }
  if (score >= 2) {
    return {
      state: "BULLISH_CONFIRMATION",
      labelZh: "资金结构偏多确认",
      summaryZh: "主动买盘和价格结构偏强，可作为正式看涨方向的执行确认。",
      executionStatusZh: "只在正式方向同为看涨且技术买点成立时使用",
      riskFlags,
      score,
      authority: "EXECUTION_ONLY",
      canOverrideFormalDirection: false,
    };
  }
  if (score <= -2) {
    return {
      state: "BEARISH_CONFIRMATION",
      labelZh: "资金结构偏空确认",
      summaryZh: "主动卖盘和价格结构偏弱，可作为正式看跌方向的执行确认。",
      executionStatusZh: "只在正式方向同为看跌且技术卖点成立时使用",
      riskFlags,
      score,
      authority: "EXECUTION_ONLY",
      canOverrideFormalDirection: false,
    };
  }
  const hasAny = Object.values(metrics).some((value) => typeof value === "number" && Number.isFinite(value));
  return {
    state: hasAny ? "NEUTRAL" : "UNAVAILABLE",
    labelZh: hasAny ? "资金结构中性" : "微观结构暂不可用",
    summaryZh: hasAny ? "多空证据暂未形成明显同向确认。" : "公开衍生品数据暂时未能读取。",
    executionStatusZh: "继续等待缠论和价格确认",
    riskFlags,
    score,
    authority: "EXECUTION_ONLY",
    canOverrideFormalDirection: false,
  };
}
