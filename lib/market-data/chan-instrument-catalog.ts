import type { ChanInstrument, ChanInstrumentSymbol } from "@/types/chan-execution";

export const CHAN_INSTRUMENTS: readonly ChanInstrument[] = [
  { symbol: "BTCUSDT", label: "BTC 比特币", provider: "BITGET_PUBLIC", providerSymbol: "BTCUSDT", formalPlanSymbol: "BTC", market: "CRYPTO" },
  { symbol: "ETHUSDT", label: "ETH 以太坊", provider: "BITGET_PUBLIC", providerSymbol: "ETHUSDT", formalPlanSymbol: "ETH", market: "CRYPTO" },
  ...(["SPY", "QQQ", "AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "META", "TSLA", "AVGO", "MU", "SNDK", "NBIS"] as const).map((symbol) => ({
    symbol, label: symbol, provider: "YAHOO_CHART" as const, providerSymbol: symbol, formalPlanSymbol: symbol, market: "US_EQUITY" as const,
  })),
];

const bySymbol = new Map(CHAN_INSTRUMENTS.map((item) => [item.symbol, item]));

const ORDERLY_EQUITIES = new Set([
  "AAOI", "AAPL", "AMD", "AMZN", "BABA", "COIN", "CRCL", "DELL", "GOOGL", "HOOD",
  "INTC", "META", "MRVL", "MSFT", "MSTR", "MU", "NBIS", "NVDA", "SNDK", "TSLA", "TSM", "WDC",
]);
const ORDERLY_INDEX_COMMODITY = new Set([
  "BVIV", "BZ", "CL", "COPPER", "DRAM", "EURUSD", "EWY", "NAS100", "NATGAS", "PAXG", "QQQ",
  "SAMSUNG", "SKHYNIX", "SOXL", "SPX", "SPX500", "SPY", "USDJPY", "XAG", "XAU", "XAUT",
]);
const ORDERLY_FORMAL_SYMBOL: Record<string, string> = {
  SPX500: "SPX", SPX: "SPX", SPY: "SPX", NAS100: "NDX", QQQ: "NDX",
  XAU: "GOLD", XAUT: "GOLD", PAXG: "GOLD", XAG: "SILVER", CL: "WTI",
};

export type OrderlyInstrumentRow = { symbol?: unknown };

export function buildOrderlyChanInstruments(rows: readonly OrderlyInstrumentRow[]): ChanInstrument[] {
  const instruments = new Map<string, ChanInstrument>();
  for (const row of rows) {
    const providerSymbol = typeof row.symbol === "string" ? row.symbol.trim().toUpperCase() : "";
    const match = /^PERP_([A-Z0-9]+)_USDC(?:_[A-Z0-9]+)?$/i.exec(providerSymbol);
    if (!match) continue;
    const symbol = match[1]!;
    const market = ORDERLY_EQUITIES.has(symbol)
      ? "US_EQUITY" as const
      : ORDERLY_INDEX_COMMODITY.has(symbol)
        ? "INDEX_COMMODITY" as const
        : "CRYPTO" as const;
    const suffix = market === "US_EQUITY" ? "美股合约" : market === "INDEX_COMMODITY" ? "指数/商品合约" : "加密合约";
    const candidate: ChanInstrument = {
      symbol,
      label: `${symbol} · ${suffix}`,
      provider: "ORDERLY_PUBLIC",
      providerSymbol,
      formalPlanSymbol: ORDERLY_FORMAL_SYMBOL[symbol] ?? symbol,
      market,
    };
    const existing = instruments.get(symbol);
    // Prefer Orderly's canonical unsuffixed market over builder-specific variants.
    if (!existing || providerSymbol === `PERP_${symbol}_USDC`) instruments.set(symbol, candidate);
  }
  return [...instruments.values()].sort((a, b) => a.symbol.localeCompare(b.symbol));
}

export function mergeChanInstrumentCatalog(orderly: readonly ChanInstrument[]): ChanInstrument[] {
  const merged = new Map<string, ChanInstrument>();
  for (const item of orderly) merged.set(item.symbol, item);
  for (const item of CHAN_INSTRUMENTS) if (!merged.has(item.symbol)) merged.set(item.symbol, item);
  return [...merged.values()].sort((a, b) => {
    const priority = (row: ChanInstrument) => (["BTC", "ETH", "SOL", "HYPE", "SPX500", "NAS100", "AAPL", "MSFT", "NVDA", "GOOGL", "TSLA"].indexOf(row.symbol) + 1) || 999;
    return priority(a) - priority(b) || a.symbol.localeCompare(b.symbol);
  });
}

export function resolveChanInstrument(value: unknown, catalog: readonly ChanInstrument[] = CHAN_INSTRUMENTS): ChanInstrument | null {
  if (typeof value !== "string") return null;
  const symbol = value.trim().toUpperCase();
  const known = catalog.find((item) => item.symbol === symbol) ?? bySymbol.get(symbol as ChanInstrumentSymbol);
  if (known) return known;
  // Member-gated research accepts ordinary Yahoo US tickers without exposing
  // arbitrary URLs or provider parameters. Crypto remains an explicit allowlist.
  if (!/^[A-Z][A-Z0-9.-]{0,9}$/.test(symbol) || symbol.endsWith("USDT")) return null;
  return { symbol, label: symbol, provider: "YAHOO_CHART", providerSymbol: symbol, formalPlanSymbol: symbol, market: "US_EQUITY" };
}
