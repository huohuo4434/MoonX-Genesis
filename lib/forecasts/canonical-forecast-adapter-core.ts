export type CanonicalForecastHorizon = "DAY" | "WEEK" | "MONTH" | "YEAR";

const ASSET_ID_BY_TRADE_SYMBOL: Readonly<Record<string, string>> = Object.freeze({
  BTC: "bitcoin",
  ETH: "eth",
  SOL: "sol",
  BNB: "bnb",
  XRP: "xrp",
  DOGE: "dogecoin",
  ADA: "cardano",
  AVAX: "avalanche",
  LINK: "chainlink",
  HYPE: "hype",
  MU: "mu",
  QQQ: "nasdaq-100",
  XAUT: "gold",
  XAG: "silver",
  GOOGL: "googl",
  CL: "wti-crude",
  SPY: "sp500",
  SNDK: "sandisk",
  MSFT: "msft",
  INTC: "intel",
  LITE: "lite",
  NBIS: "nbis",
  TENCENT: "tencent",
  TSLA: "tsla",
});

export function canonicalPredictionAssetId(symbolInput: string): string {
  const symbol = symbolInput.trim().toUpperCase().replace(/[-_\/\s]/g, "").replace(/USDT$/, "");
  return ASSET_ID_BY_TRADE_SYMBOL[symbol] ?? symbol.toLowerCase();
}

function inclusiveCalendarDays(periodStart: string, periodEnd: string): number | null {
  const start = Date.parse(`${periodStart}T00:00:00.000Z`);
  const end = Date.parse(`${periodEnd}T00:00:00.000Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null;
  return Math.floor((end - start) / 86_400_000) + 1;
}

/**
 * Normalize immutable legacy focus rows at the read boundary. Some early TSLA
 * weekly records exhausted the old forecastType slots and were stored as
 * MONTH_1, MONTH_3 or TODAY. Their immutable id plus seven-day period still
 * identifies them as weekly; the source rows themselves remain untouched.
 */
export function canonicalConvictionForecastHorizon(input: {
  id: string;
  forecastType: string;
  periodStart: string;
  periodEnd: string;
}): CanonicalForecastHorizon {
  if (input.forecastType.startsWith("WEEK")) return "WEEK";
  const days = inclusiveCalendarDays(input.periodStart, input.periodEnd);
  if (/^[A-Z0-9]+-W\d+-\d{8}-V\d+$/i.test(input.id) && days !== null && days <= 14) return "WEEK";
  if (input.forecastType.startsWith("YEAR")) return "YEAR";
  if (input.forecastType.startsWith("MONTH")) return "MONTH";
  return "DAY";
}
