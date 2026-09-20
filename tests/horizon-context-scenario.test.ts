import test from 'node:test';
import assert from 'node:assert/strict';
import { horizonForecastPaths } from '../lib/research/horizon-forecast-paths';
import { projectTechnicalCandles } from '../lib/research/technical-candle-outlook';
import { chartZones, type KeyDateChartData } from '../lib/presentation/key-date-chart';
import type { ForecastPath } from '../lib/presentation/forecast-path';

const now = Date.parse('2026-09-20T12:00:00Z');
const paths = horizonForecastPaths('2026-09-20', now);
function fixture(assetId = 'eth'): KeyDateChartData {
  const bars = Array.from({ length: 100 }, (_, i) => {
    const timestamp = Date.parse('2026-09-19') - (99 - i) * 86400000;
    const close = 3000 + i * 2 + 8 * Math.sin(i);
    return { timestamp, date: new Date(timestamp).toISOString().slice(0, 10), open: close - 3, close, high: close + 30, low: close - 30, volume: 100 };
  });
  return { assetId, quoteSymbol: `${assetId.toUpperCase()}USDT`, timeZone: 'UTC', source: 'SYNTHETIC_TEST_ONLY', bars, ...chartZones(bars), asOf: '2026-09-19', stale: false };
}
test('future weeks are selected with current publication cutoff, not future knowledge', () => {
  assert.ok(paths.some(p => p.id === 'ETH-W9-20260928-V2'));
  assert.ok(paths.every(p => Date.parse(p.lockedAt) <= now));
  assert.deepEqual(horizonForecastPaths('2026-09-20', Date.parse('2020-01-01')), []);
});
test('ETH plots weakness then limited recovery; never invents the uncovered October tail', () => {
  const rows = projectTechnicalCandles(fixture(), paths, now);
  const scenario = rows.find(p => p.horizonContext)!;
  assert.equal(rows.find(p => p.level === 'MONTH'), scenario);
  assert.equal(scenario.direction, '先涨后跌');
  assert.equal(scenario.horizonContext!.partial, true);
  assert.equal(scenario.candles.at(-1)!.date, '2026-10-07');
  assert.ok(scenario.horizonContext!.phases.some(p => p.start === '2026-09-21' && p.direction === '震荡下跌'));
  assert.ok(scenario.horizonContext!.phases.some(p => p.start === '2026-09-28' && p.direction === '震荡上涨'));
  const price = (d: string) => scenario.candles.find(c => c.date === d)!.baselineClose;
  assert.ok(price('2026-09-27') < price('2026-09-20'));
  assert.ok(price('2026-10-04') > price('2026-09-27'));
  assert.ok(price('2026-10-07') < price('2026-10-04'));
  assert.equal(rows.filter(p => p.level === 'MONTH').length, 2);
  assert.equal(rows[0]!.level, 'WEEK');
});
test('SOL and HYPE use their October rise, not an all-assets bearish override', () => {
  for (const asset of ['sol', 'hype']) {
    const row = projectTechnicalCandles(fixture(asset), paths, now).find(p => p.horizonContext)!;
    assert.equal(row.candles.at(-1)!.date, '2026-10-17');
    assert.equal(row.horizonContext!.partial, false);
    assert.ok(row.horizonContext!.phases.some(p => p.start >= '2026-10-01' && p.direction === '上涨'));
    assert.ok(row.candles.at(-1)!.baselineClose > row.candles.find(c => c.date === '2026-10-05')!.baselineClose);
  }
});
test('every active asset preserves sources, price continuity, finite OHLC and source expiry', () => {
  const before = JSON.stringify(paths);
  const assets = [...new Set(paths.filter(p => p.level === 'MONTH').map(p => p.assetId))];
  assert.equal(assets.length, 26);
  for (const asset of assets) {
    const data = fixture(asset);
    const beforeData = JSON.stringify(data);
    const rows = projectTechnicalCandles(data, paths, now);
    const row = rows.find(p => p.horizonContext);
    if (!row) { assert.equal(asset, 'btc'); continue; }
    assert.equal(row.horizonContext!.authority, 'RESEARCH_ONLY');
    assert.ok(row.candles.at(-1)!.date <= row.horizonContext!.originalEnd);
    assert.ok(row.candles.at(-1)!.date <= '2026-10-17');
    assert.equal(new Set(row.candles.map(c => c.date)).size, row.candles.length);
    for (const [i, c] of row.candles.entries()) {
      assert.ok([c.open, c.high, c.low, c.close, c.baselineClose].every(Number.isFinite), asset);
      assert.ok(c.low > 0 && c.low <= Math.min(c.open, c.close) && c.high >= Math.max(c.open, c.close), asset);
      assert.equal(c.open, i === 0 ? row.technical!.anchorPrice : row.candles[i - 1]!.close);
      assert.equal(c.volume, null);
    }
    assert.equal(JSON.stringify(data), beforeData);
    assert.deepEqual(rows, projectTechnicalCandles(data, paths, now));
  }
  assert.equal(JSON.stringify(paths), before);
});
test('expired, future-locked, wrong-asset or weekly-only inputs never create a monthly authority', () => {
  const source = paths.find(p => p.assetId === 'eth' && p.level === 'MONTH')!;
  const cases: ForecastPath[][] = [[], [{ ...source, periodEnd: '2026-09-19' }], [{ ...source, lockedAt: '2027-01-01' }], [{ ...source, assetId: 'gold' }], paths.filter(p => p.level === 'WEEK')];
  for (const sources of cases) assert.equal(projectTechnicalCandles(fixture(), sources, now).some(p => p.horizonContext), false);
  assert.deepEqual(projectTechnicalCandles({ ...fixture(), stale: true }, paths, now), []);
});
