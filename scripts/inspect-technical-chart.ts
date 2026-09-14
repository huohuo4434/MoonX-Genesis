/** Read-only public spot-data smoke check. No account, database or order access. */
import { loadChartCryptoUtc } from '../lib/market-data/chart-crypto-utc';
import { loadChartFourHour } from '../lib/market-data/chart-crypto-four-hour';
import { finalizedChartBars, expectedClosedSession } from '../lib/presentation/chart-daily-session';
import { chartZones } from '../lib/presentation/key-date-chart';
import { projectTechnicalCandles } from '../lib/research/technical-candle-outlook';

async function main() {
  const now = Date.now();
  for (const asset of ['btc', 'eth']) {
    const symbol = asset.toUpperCase() + 'USDT';
    const raw = await loadChartCryptoUtc(symbol, now);
    const fast = await loadChartFourHour(symbol, raw.source, now);
    const bars = finalizedChartBars(raw.candles, asset, 'UTC', now);
    const data = { assetId: asset, quoteSymbol: symbol, source: raw.source, timeZone: 'UTC', bars, ...chartZones(bars),
      asOf: bars.at(-1)!.date, stale: bars.at(-1)!.date < expectedClosedSession(asset, 'UTC', now) };
    const rows = projectTechnicalCandles(data, [], now, fast);
    console.log(JSON.stringify({ asset, checkedAt: new Date(now), asOf: data.asOf, stale: data.stale, source: raw.source,
      projections: rows.map(p => ({ direction: p.direction, horizon: p.level, technical: p.technical, first: p.candles[0], last: p.candles.at(-1) })) }));
  }
}
main().catch(error => { console.error(error instanceof Error ? error.message : 'PUBLIC_FEED_CHECK_FAILED'); process.exitCode = 1; });
