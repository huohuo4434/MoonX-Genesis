import type { ChanTimeframe } from "@/types/chan-execution";

export const MULTI_SOURCE_CRYPTO_SYMBOLS = [
  "BTC", "ETH", "SOL", "HYPE", "BNB", "XRP", "DOGE", "ADA", "AVAX", "LINK", "SUI",
] as const;

export type MultiSourceCryptoSymbol = (typeof MULTI_SOURCE_CRYPTO_SYMBOLS)[number];

export const CRYPTO_SYMBOL_LABELS: Record<string, string> = {
  BTC: "比特币 BTC", ETH: "以太坊 ETH", SOL: "Solana SOL", HYPE: "Hyperliquid HYPE",
  BNB: "BNB", XRP: "XRP", DOGE: "Dogecoin DOGE", ADA: "Cardano ADA",
  AVAX: "Avalanche AVAX", LINK: "Chainlink LINK", SUI: "Sui SUI",
};

export const COINGECKO_IDS: Record<string, string> = {
  BTC: "bitcoin", ETH: "ethereum", SOL: "solana", HYPE: "hyperliquid", BNB: "binancecoin",
  XRP: "ripple", DOGE: "dogecoin", ADA: "cardano", AVAX: "avalanche-2", LINK: "chainlink", SUI: "sui",
};

export function normalizeCryptoBaseSymbol(value: unknown): string {
  if (typeof value !== "string") return "BTC";
  const normalized = value.trim().toUpperCase().replace(/[-_/\s]/g, "");
  const base = normalized.endsWith("USDT") ? normalized.slice(0, -4) : normalized;
  if (!/^[A-Z0-9]{2,15}$/.test(base)) return "BTC";
  return base;
}

export function toBinanceSpotSymbol(value: unknown): string { return `${normalizeCryptoBaseSymbol(value)}USDT`; }
export function toOkxSpotInstrument(value: unknown): string { return `${normalizeCryptoBaseSymbol(value)}-USDT`; }
export function toBitgetFuturesSymbol(value: unknown): string { return `${normalizeCryptoBaseSymbol(value)}USDT`; }

export function binanceInterval(timeframe: ChanTimeframe): string {
  return ({ "5m": "5m", "30m": "30m", "1H": "1h", "4H": "4h", "1D": "1d", "1W": "1w" })[timeframe];
}
export function okxInterval(timeframe: ChanTimeframe): string {
  return ({ "5m": "5m", "30m": "30m", "1H": "1H", "4H": "4H", "1D": "1D", "1W": "1W" })[timeframe];
}
export function bitgetInterval(timeframe: ChanTimeframe): string {
  return ({ "5m": "5m", "30m": "30m", "1H": "1H", "4H": "4H", "1D": "1D", "1W": "1W" })[timeframe];
}
