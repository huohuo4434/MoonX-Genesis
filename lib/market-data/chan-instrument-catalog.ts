import type { ChanInstrument, ChanInstrumentSymbol } from "@/types/chan-execution";

export const CHAN_INSTRUMENTS: readonly ChanInstrument[] = [
  { symbol: "BTCUSDT", label: "Bitcoin", provider: "BITGET_PUBLIC", providerSymbol: "BTCUSDT", formalPlanSymbol: "BTC", market: "CRYPTO" },
  { symbol: "ETHUSDT", label: "Ethereum", provider: "BITGET_PUBLIC", providerSymbol: "ETHUSDT", formalPlanSymbol: "ETH", market: "CRYPTO" },
  ...(["SPY", "QQQ", "NVDA", "MSFT", "GOOGL", "MU", "SNDK"] as const).map((symbol) => ({
    symbol, label: symbol, provider: "YAHOO_CHART" as const, providerSymbol: symbol, formalPlanSymbol: symbol, market: "US_EQUITY" as const,
  })),
];

const bySymbol = new Map(CHAN_INSTRUMENTS.map((item) => [item.symbol, item]));

export function resolveChanInstrument(value: unknown): ChanInstrument | null {
  if (typeof value !== "string") return null;
  return bySymbol.get(value.trim().toUpperCase() as ChanInstrumentSymbol) ?? null;
}
