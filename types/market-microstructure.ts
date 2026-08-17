import type { ChanCandle, ChanTimeframe } from "@/types/chan-execution";

export type CryptoMarketProvider = "BINANCE_SPOT" | "OKX_SPOT" | "BITGET_FUTURES";
export type MarketSourceStatus = "HEALTHY" | "DEGRADED" | "FAILED";
export type MarketDataQuality = "GOOD" | "DEGRADED" | "BLOCKED";
export type MicrostructureState =
  | "BULLISH_CONFIRMATION"
  | "BEARISH_CONFIRMATION"
  | "LONG_CROWDING"
  | "SHORT_CROWDING"
  | "DELEVERAGING"
  | "NEUTRAL"
  | "UNAVAILABLE";

export type CryptoSourceSnapshot = {
  provider: CryptoMarketProvider;
  status: MarketSourceStatus;
  candleCount: number;
  latestClosedAt: string | null;
  latestPrice: number | null;
  latencyMs: number;
  stale: boolean;
  errorCode: string | null;
};

export type MultiSourceProvenance = {
  symbol: string;
  timeframe: ChanTimeframe;
  selectedProvider: CryptoMarketProvider | null;
  capturedAt: string;
  sourceCount: number;
  consensusPrice: number | null;
  divergencePct: number | null;
  quality: MarketDataQuality;
  precisionLevelsAllowed: boolean;
  closedCandlesOnly: true;
  sources: CryptoSourceSnapshot[];
};

export type MultiSourceCryptoCandles = {
  symbol: string;
  timeframe: ChanTimeframe;
  candles: ChanCandle[];
  provenance: MultiSourceProvenance;
  error: string | null;
};

export type MicrostructureMetrics = {
  spotPrice: number | null;
  futuresPrice: number | null;
  markPrice: number | null;
  indexPrice: number | null;
  basisPct: number | null;
  fundingRate: number | null;
  fundingRateBps: number | null;
  nextFundingAt: string | null;
  openInterest: number | null;
  openInterestValue: number | null;
  openInterestChangePct: number | null;
  globalLongShortRatio: number | null;
  longAccountPct: number | null;
  shortAccountPct: number | null;
  takerBuySellRatio: number | null;
  priceChangePct: number | null;
};

export type MicrostructureAssessment = {
  state: MicrostructureState;
  labelZh: string;
  summaryZh: string;
  executionStatusZh: string;
  riskFlags: string[];
  score: number;
  authority: "EXECUTION_ONLY";
  canOverrideFormalDirection: false;
};

export type CoinGeckoTrendingCoin = {
  id: string;
  symbol: string;
  name: string;
  marketCapRank: number | null;
  priceUsd: number | null;
  priceChangePct24h: number | null;
};

export type CoinGeckoMarketContext = {
  available: boolean;
  totalMarketCapUsd: number | null;
  totalVolumeUsd: number | null;
  marketCapChangePct24h: number | null;
  btcDominancePct: number | null;
  ethDominancePct: number | null;
  trending: CoinGeckoTrendingCoin[];
  updatedAt: string;
  errorCode: string | null;
};

export type CryptoMarketIntelligence = {
  symbol: string;
  timeframe: ChanTimeframe;
  candles: ChanCandle[];
  provenance: MultiSourceProvenance;
  metrics: MicrostructureMetrics;
  assessment: MicrostructureAssessment;
  marketContext: CoinGeckoMarketContext;
  capturedAt: string;
  researchOnly: true;
  autoTradingChanged: false;
};
