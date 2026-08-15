import "server-only";
import type { ChanCandle, ChanTimeframe } from "@/types/chan-execution";
import { aggregateYahooFourHourCandles, filterClosedCandles, filterYahooClosedCandles, isValidChanCandle, parseYahooChanCandles } from "@/lib/market-data/chan-market-data-core";
import { resolveChanInstrument } from "@/lib/market-data/chan-instrument-catalog";

const intervals = new Set<ChanTimeframe>(["30m", "1H", "4H", "1D"]);

async function fetchYahooCandles(input: { providerSymbol: string; timeframe: ChanTimeframe; capturedNowMs: number; signal: AbortSignal }): Promise<ChanCandle[]> {
  const queryTimeframe = input.timeframe === "4H" ? "30m" : input.timeframe === "1H" ? "1h" : input.timeframe === "1D" ? "1d" : "30m";
  const range = input.timeframe === "1D" ? "2y" : input.timeframe === "1H" ? "6mo" : "60d";
  const encoded = encodeURIComponent(input.providerSymbol);
  const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encoded}?interval=${queryTimeframe}&range=${range}&includePrePost=false`, {
    cache: "no-store", signal: input.signal, headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0 MOOX-Chan-Research/2.0" },
  });
  if (!response.ok) throw new Error(`YAHOO_HTTP_${response.status}`);
  const parsed = parseYahooChanCandles(await response.json());
  const closed = filterYahooClosedCandles(parsed.candles, input.timeframe === "4H" ? "30m" : input.timeframe, input.capturedNowMs, parsed.timeZone);
  return input.timeframe === "4H" ? aggregateYahooFourHourCandles(closed, parsed.timeZone, input.capturedNowMs).slice(-120) : closed.slice(-120);
}

export async function loadChanCandles(input: { symbol: string; timeframe: string; timeoutMs?: number; capturedNowMs?: number }): Promise<{ symbol: string; timeframe: ChanTimeframe; candles: ChanCandle[]; error: string | null }> {
  const capturedNowMs = input.capturedNowMs ?? Date.now();
  const instrument = resolveChanInstrument(input.symbol);
  const symbol = instrument?.symbol ?? input.symbol.toUpperCase();
  const timeframe = input.timeframe as ChanTimeframe;
  if (!instrument || !intervals.has(timeframe)) return { symbol, timeframe, candles: [], error: "UNSUPPORTED_MARKET" };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.max(500, Math.min(input.timeoutMs ?? 4_000, 5_000)));
  try {
    if (instrument.provider === "YAHOO_CHART") {
      const candles = await fetchYahooCandles({ providerSymbol: instrument.providerSymbol, timeframe, capturedNowMs, signal: controller.signal });
      return candles.length ? { symbol, timeframe, candles, error: null } : { symbol, timeframe, candles: [], error: "EMPTY_MARKET_DATA" };
    }
    const query = new URLSearchParams({ category: "USDT-FUTURES", symbol, interval: timeframe, type: "market", limit: "120" });
    const response = await fetch(`https://api.bitget.com/api/v3/market/candles?${query}`, { cache: "no-store", signal: controller.signal, headers: { Accept: "application/json", "User-Agent": "MOOX-Chan-Research/1.0" } });
    if (!response.ok) return { symbol, timeframe, candles: [], error: `HTTP_${response.status}` };
    const payload = await response.json() as { code?: string; data?: string[][] };
    if (payload.code !== "00000" || !Array.isArray(payload.data)) return { symbol, timeframe, candles: [], error: "INVALID_MARKET_DATA" };
    const candles = filterClosedCandles(payload.data.map((row) => ({ timestamp: Number(row[0]), open: Number(row[1]), high: Number(row[2]), low: Number(row[3]), close: Number(row[4]), volume: Number.isFinite(Number(row[5])) ? Number(row[5]) : null })).filter(isValidChanCandle).sort((a, b) => a.timestamp - b.timestamp), timeframe, capturedNowMs);
    return candles.length ? { symbol, timeframe, candles, error: null } : { symbol, timeframe, candles: [], error: "EMPTY_MARKET_DATA" };
  } catch { return { symbol, timeframe, candles: [], error: "MARKET_DATA_TIMEOUT_OR_FAILURE" }; }
  finally { clearTimeout(timer); }
}

export async function loadChanTimeframes(input: {
  symbol: string;
  capturedNowMs: number;
  timeoutMs?: number;
}): Promise<Array<Awaited<ReturnType<typeof loadChanCandles>>>> {
  return Promise.all(
    (["30m", "1H", "4H", "1D"] as const).map((timeframe) =>
      loadChanCandles({ ...input, timeframe })
    )
  );
}
