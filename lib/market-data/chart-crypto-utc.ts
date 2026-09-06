import { isValidChanCandle } from './chan-market-data-core';
import type { ChanCandle } from '@/types/chan-execution';

export function parseChartUtcCandles(rows: unknown, now: number, okx = false): ChanCandle[] {
  if (!Array.isArray(rows)) return [];
  return rows.filter(row => Array.isArray(row) && (!okx || row[8] === '1')).map(row => ({
    timestamp: Number(row[0]), open: Number(row[1]), high: Number(row[2]), low: Number(row[3]), close: Number(row[4]), volume: Number(row[5]),
  })).filter(isValidChanCandle).filter(b => b.timestamp % 86_400_000 === 0 && b.timestamp + 86_400_000 <= now)
    .sort((a, b) => a.timestamp - b.timestamp);
}
/** Public research quotes only. Explicit UTC daily bars; no account or order endpoints. */
export async function loadChartCryptoUtc(symbol: string, now: number) {
  if (!['BTCUSDT','ETHUSDT','SOLUSDT','HYPEUSDT'].includes(symbol)) throw new Error('UNSUPPORTED_MARKET');
  const providers = [
    { source: 'Binance spot / UTC daily / USDT', url: `https://data-api.binance.vision/api/v3/klines?symbol=${symbol}&interval=1d&timeZone=0&limit=120`, okx: false },
    { source: 'OKX spot / UTC daily / USDT', url: `https://www.okx.com/api/v5/market/candles?instId=${symbol.replace('USDT','-USDT')}&bar=1Dutc&limit=120`, okx: true },
  ];
  const results = await Promise.all(providers.map(async p => {
    try {
      const response = await fetch(p.url, { cache: 'no-store', signal: AbortSignal.timeout(5000) });
      if (!response.ok) return null;
      const payload = await response.json();
      const candles = parseChartUtcCandles(p.okx ? payload.code === '0' ? payload.data : [] : payload, now, p.okx);
      return candles.length >= 20 ? { candles, source: p.source } : null;
    } catch { return null; }
  }));
  const result = results.filter(r => r !== null).sort((a, b) => b.candles.at(-1)!.timestamp - a.candles.at(-1)!.timestamp)[0];
  if (!result) throw new Error('MARKET_DATA_UNAVAILABLE');
  return result;
}
