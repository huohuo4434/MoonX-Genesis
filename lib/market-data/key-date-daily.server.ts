import "server-only";
import { loadChartCryptoUtc } from "./chart-crypto-utc";
import { loadSpecialDaily, SPCX_ORDERLY_SYMBOL, ASTEROID_TOKEN } from './chart-special-daily';
import { isChartChinaEquity } from '@/lib/presentation/chart-market-calendar';
import { parseYahooChanCandles } from "./chan-market-data-core";
import { chartZones } from "@/lib/presentation/key-date-chart";
import { exchangeDate, expectedClosedSession, finalizedChartBars } from "@/lib/presentation/chart-daily-session";
import { buildMemberKeyDateRadar, keyDateChartForecasts } from "@/lib/data/member-key-date-radar";
import { forecastPaths } from "@/lib/presentation/forecast-path";
import { projectDailyCandles, projectionCoverage, PROJECTION_ENGINE, type DailyProjectionData } from "@/lib/research/daily-candle-projection-core";

export const KEY_DATE_SYMBOLS: Record<string, string> = {
  btc: "BTCUSDT", eth: "ETHUSDT", sol: "SOLUSDT", hype: "HYPEUSDT",
  sandisk: "SNDK", mu: "MU", nvda: "NVDA", aapl: "AAPL", amzn: "AMZN", meta: "META",
  googl: "GOOGL", msft: "MSFT", tsla: "TSLA", lite: "LITE", nbis: "NBIS", intel: "INTC",
  tencent: "0700.HK", gold: "GC=F", silver: "SI=F",
  spcx: SPCX_ORDERLY_SYMBOL, asteroid: ASTEROID_TOKEN, cxmt: '688825.SS', 'wti-crude': 'CL=F',
  'ganfeng-lithium': '002460.SZ', 'lian-tech': '300784.SZ', 'lexin-medical': '300562.SZ',
};
export async function loadKeyDateDaily(assetId: string, now = Date.now()): Promise<DailyProjectionData> {
  const quoteSymbol = Object.hasOwn(KEY_DATE_SYMBOLS, assetId) ? KEY_DATE_SYMBOLS[assetId] : undefined;
  if (!quoteSymbol) throw new Error("UNSUPPORTED_MARKET");
  const crypto = quoteSymbol.endsWith("USDT");
  const special = assetId === 'spcx' || assetId === 'asteroid';
  const timeZone = crypto || special ? "UTC" : isChartChinaEquity(assetId) ? 'Asia/Shanghai' : assetId === "tencent" ? "Asia/Hong_Kong" : "America/New_York";
  let candles;
  let cryptoSource = '';
  if (special) {
    const result = await loadSpecialDaily(assetId, now);
    candles = result.candles;
    cryptoSource = result.source;
  } else if (crypto) {
    const result = await loadChartCryptoUtc(quoteSymbol, now);
    candles = result.candles;
    cryptoSource = result.source;
  } else {
    // This research-only loader can accept today's finalized equity close, independently of trading loaders.
    const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(quoteSymbol)}?interval=1d&range=1y&includePrePost=false`, {
      cache: "no-store", signal: AbortSignal.timeout(5000), headers: { "User-Agent": "Mozilla/5.0 MOOX-Research-Chart/1.0" },
    });
    if (!response.ok) throw new Error("MARKET_DATA_UNAVAILABLE");
    candles = parseYahooChanCandles(await response.json()).candles;
  }
  const bars = finalizedChartBars(candles, assetId, timeZone, now);
  if (!bars.length) throw new Error("MARKET_DATA_UNAVAILABLE");
  const expectedAsOf = expectedClosedSession(assetId, timeZone, now);
  const projectionDate = exchangeDate(now, timeZone);
  const items = buildMemberKeyDateRadar(projectionDate);
  const paths = forecastPaths(items, keyDateChartForecasts(items, now), projectionDate);
  const data: DailyProjectionData = { assetId, quoteSymbol, timeZone, bars, ...chartZones(bars),
    source: crypto || special ? cryptoSource : quoteSymbol.endsWith("=F") ? "Yahoo Finance / continuous futures" : "Yahoo Finance",
    asOf: bars.at(-1)!.date, stale: bars.at(-1)!.date < expectedAsOf, checkedAt: new Date(now).toISOString(),
    expectedAsOf, projectionDate, engine: PROJECTION_ENGINE, projections: [], archiveStatus: "NOT_APPLICABLE", archiveId: null };
  data.projections = projectDailyCandles(data, paths, now);
  data.unavailable = projectionCoverage(data, paths, data.projections, now);
  return data;
}
