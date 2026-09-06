import { parseChartUtcCandles } from './chart-crypto-utc';

export const SPCX_ORDERLY_SYMBOL = 'PERP_SPCX_USDC_mythos';
export const ASTEROID_TOKEN = '0xf280b16ef293d8e534e370794ef26bf312694126';
// Exact Ethereum pool verified with DexScreener and GeckoTerminal on 2026-09-06.
export const ASTEROID_POOL = '0x76a411f14a704099ba476ce8dffc288a53295218';

export function parseOrderlyDaily(payload: unknown, now: number) {
  if (!payload || typeof payload !== 'object') return [];
  const p = payload as Record<string, unknown>;
  if (p.s !== 'ok' || !Array.isArray(p.t)) return [];
  const fields = ['o','h','l','c','v'].map(key => p[key]);
  if (!fields.every(f => Array.isArray(f) && f.length === (p.t as unknown[]).length)) return [];
  const rows = p.t.map((t, i) => [Number(t) * 1000, ...fields.map(f => (f as unknown[])[i])]);
  return parseChartUtcCandles(rows, now);
}
async function publicJson(url: string) {
  const r = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(5000) });
  if (!r.ok) throw new Error('MARKET_DATA_UNAVAILABLE');
  return r.json();
}
/** Read-only public feeds, no wallet, account key or order endpoints. */
export async function loadSpecialDaily(asset: 'spcx' | 'asteroid', now: number) {
  if (asset === 'spcx') {
    const query = new URLSearchParams({ symbol: SPCX_ORDERLY_SYMBOL, resolution: '1d',
      from: String(Math.floor(now / 1000) - 120 * 86400), to: String(Math.floor(now / 1000)), limit: '120' });
    return { candles: parseOrderlyDaily(await publicJson(`https://api.orderly.org/v1/tv/kline_history?${query}`), now),
      source: 'Orderly / Mythos SPCX perpetual / USDC / UTC (may include zero-trade quote bars)' };
  }
  const pool = await publicJson(`https://api.geckoterminal.com/api/v2/networks/eth/pools/${ASTEROID_POOL}`);
  if (pool.data?.relationships?.base_token?.data?.id?.toLowerCase() !== `eth_${ASTEROID_TOKEN}`) throw new Error('MARKET_IDENTITY_MISMATCH');
  const payload = await publicJson(`https://api.geckoterminal.com/api/v2/networks/eth/pools/${ASTEROID_POOL}/ohlcv/day?aggregate=1&limit=120&currency=usd&token=base`);
  const rows = payload.data?.attributes?.ohlcv_list;
  return { candles: parseChartUtcCandles(Array.isArray(rows) ? rows.map((r: unknown[]) => [Number(r[0]) * 1000, ...r.slice(1)]) : [], now),
    source: 'GeckoTerminal / Ethereum ASTEROID-WETH / token price USD / UTC' };
}
