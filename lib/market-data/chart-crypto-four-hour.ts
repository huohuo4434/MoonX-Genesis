import { isValidChanCandle } from './chan-market-data-core';
import type { ChanCandle } from '@/types/chan-execution';
import type { IntradayContext } from '@/lib/research/technical-candle-outlook';

export function parseClosedFourHour(rows: unknown, now: number): ChanCandle[] {
  if (!Array.isArray(rows)) return [];
  const span = 4 * 3_600_000;
  return [...new Map(rows.filter(Array.isArray).map(r => ({ timestamp: Number(r[0]), open: Number(r[1]), high: Number(r[2]),
    low: Number(r[3]), close: Number(r[4]), volume: Number(r[5]) })).filter(isValidChanCandle)
    .filter(b => b.timestamp % span === 0 && b.timestamp + span <= now)
    .sort((a, b) => a.timestamp - b.timestamp).map(b => [b.timestamp, b])).values()];
}

/** Same spot venue as the daily source; never substitute a futures or another venue. */
export async function loadChartFourHour(symbol: string, dailySource: string, now: number): Promise<IntradayContext | null> {
  if (!['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'HYPEUSDT'].includes(symbol)) return null;
  const okx = dailySource.startsWith('OKX spot');
  if (!okx && !dailySource.startsWith('Binance spot')) return null;
  const url = okx ? `https://www.okx.com/api/v5/market/candles?instId=${symbol.replace('USDT', '-USDT')}&bar=4H&limit=120`
    : `https://data-api.binance.vision/api/v3/klines?symbol=${symbol}&interval=4h&timeZone=0&limit=120`;
  try {
    const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(5000) });
    if (!response.ok) return null;
    const payload = await response.json();
    const rows = okx ? payload.code === '0' && Array.isArray(payload.data) ? payload.data.filter((r: unknown) => Array.isArray(r) && r[8] === '1') : [] : payload;
    return { source: `${okx ? 'OKX' : 'Binance'} spot / UTC 4h / USDT`, candles: parseClosedFourHour(rows, now) };
  } catch { return null; }
}
