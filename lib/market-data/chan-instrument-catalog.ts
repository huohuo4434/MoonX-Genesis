import type { ChanInstrument, ChanInstrumentSymbol } from "@/types/chan-execution";

export const CHAN_INSTRUMENTS: readonly ChanInstrument[] = [
  { symbol: "BTCUSDT", label: "BTC 比特币", provider: "BITGET_PUBLIC", providerSymbol: "BTCUSDT", formalPlanSymbol: "BTC", market: "CRYPTO" },
  { symbol: "ETHUSDT", label: "ETH 以太坊", provider: "BITGET_PUBLIC", providerSymbol: "ETHUSDT", formalPlanSymbol: "ETH", market: "CRYPTO" },
  ...(["SPY", "QQQ", "AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "META", "TSLA", "AVGO", "MU", "SNDK", "NBIS"] as const).map((symbol) => ({
    symbol, label: symbol, provider: "YAHOO_CHART" as const, providerSymbol: symbol, formalPlanSymbol: symbol, market: "US_EQUITY" as const,
  })),
];

const bySymbol = new Map(CHAN_INSTRUMENTS.map((item) => [item.symbol, item]));

export function resolveChanInstrument(value: unknown): ChanInstrument | null {
  if (typeof value !== "string") return null;
  const symbol = value.trim().toUpperCase();
  const known = bySymbol.get(symbol as ChanInstrumentSymbol);
  if (known) return known;
  // Member-gated research accepts ordinary Yahoo US tickers without exposing
  // arbitrary URLs or provider parameters. Crypto remains an explicit allowlist.
  if (!/^[A-Z][A-Z0-9.-]{0,9}$/.test(symbol) || symbol.endsWith("USDT")) return null;
  return { symbol, label: symbol, provider: "YAHOO_CHART", providerSymbol: symbol, formalPlanSymbol: symbol, market: "US_EQUITY" };
}
