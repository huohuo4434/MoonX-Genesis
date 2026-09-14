import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { projectTechnicalCandles, technicalFrame } from '../lib/research/technical-candle-outlook';
import { parseClosedFourHour } from '../lib/market-data/chart-crypto-four-hour';
import { chartZones, chartLevelLadder, type KeyDateChartData } from '../lib/presentation/key-date-chart';
import type { ForecastPath } from '../lib/presentation/forecast-path';

const now = Date.parse('2026-09-15T06:00:00Z');
function fixture(up = true): KeyDateChartData {
  const bars = Array.from({ length: 100 }, (_, i) => {
    const timestamp = Date.parse('2026-09-14T00:00:00Z') - (99 - i) * 86400000;
    const close = 500 + (up ? 1 : -1) * i * 2 + Math.sin(i) * .5;
    return { date: new Date(timestamp).toISOString().slice(0, 10), timestamp, close, open: close - .2, high: close + 2, low: close - 2, volume: 100 };
  });
  return { assetId: 'btc', quoteSymbol: 'BTCUSDT', source: 'TEST_ONLY', timeZone: 'UTC', bars, ...chartZones(bars), asOf: '2026-09-14', stale: false };
}
function source(): ForecastPath {
  return { id: 'unchanged-source', assetId: 'btc', direction: '下跌', level: 'WEEK', sourceHorizon: 'WEEK',
    periodStart: '2026-09-14', periodEnd: '2026-09-20', version: 2, lockedAt: '2026-09-12T00:00:00Z', windows: [] };
}
test('technical trends can disagree with old source direction without changing publications', () => {
  const s = source(), before = JSON.stringify(s);
  const up = projectTechnicalCandles(fixture(), [s], now);
  const down = projectTechnicalCandles(fixture(false), [{ ...s, direction: '上涨' }], now);
  assert.equal(up[0]!.direction, '震荡上涨');
  assert.equal(down[0]!.direction, '震荡下跌');
  assert.equal(JSON.stringify(s), before);
  assert.equal(up[0]!.technical!.authority, 'RESEARCH_ONLY');
  assert.deepEqual(up, projectTechnicalCandles(fixture(), [s], now));
  assert.equal(projectTechnicalCandles(fixture(), [], now).length, 2);
});
test('stale/invalid/short data produces no technical outlook', () => {
  const data = fixture();
  assert.deepEqual(projectTechnicalCandles({ ...data, stale: true }, [], now), []);
  assert.deepEqual(projectTechnicalCandles({ ...data, bars: data.bars.slice(-20) }, [], now), []);
  assert.equal(technicalFrame([{ ...data.bars[0]!, close: NaN }, ...data.bars.slice(1)], 86400000), null);
});
test('4h parser excludes forming, misaligned and invalid bars; deduplicates', () => {
  const ts = Date.parse('2026-09-15T00:00:00Z');
  const row = [ts, '100', '105', '95', '101', '100'];
  const bars = parseClosedFourHour([row, row, [ts + 14400000,100,105,95,101,100], [ts + 3600000,100,105,95,101,100]], now);
  assert.equal(bars.length, 1);
});
test('fresh closed 4h anchor updates between daily closes; missing/gapped/stale context is explicit', () => {
  const data = fixture();
  const candles = Array.from({ length: 100 }, (_, i) => ({ ...data.bars[i]!, timestamp: Date.parse('2026-09-15T00:00:00Z') - (99 - i) * 14400000, open: 799.8 + i, close: 800 + i, high: 802 + i, low: 798 + i }));
  const context = { source: 'TEST_4H', candles };
  const projected = projectTechnicalCandles(data, [], now, context)[0]!;
  assert.equal(projected.technical!.intradayStatus, 'CURRENT');
  assert.equal(projected.candles[0]!.open, 899);
  assert.equal(data.bars.at(-1)!.close, fixture().bars.at(-1)!.close);
  assert.equal(projectTechnicalCandles(data, [], now, { ...context, candles: candles.slice(0, -1) })[0]!.technical!.intradayStatus, 'UNAVAILABLE');
  assert.equal(projectTechnicalCandles(data, [], now, { ...context, candles: candles.filter((_, i) => i !== 80) })[0]!.technical!.intradayStatus, 'UNAVAILABLE');
});
test('timing evidence remains traceable, bounded and cannot invert the technical trend', () => {
  const s = source();
  s.windows = [{ id: 'explicit-risk', assetId: 'btc', symbol: 'BTC', level: 'WEEK', evidence: 'EXPLICIT', kind: 'risk',
    focusDate: '2026-09-17', startDate: '2026-09-17', endDate: '2026-09-17', closed: false, nextSessionDate: null }];
  const before = JSON.stringify(s);
  const plain = projectTechnicalCandles(fixture(), [], now)[0]!;
  const timed = projectTechnicalCandles(fixture(), [s], now)[0]!;
  assert.equal(timed.direction, plain.direction);
  assert.equal(JSON.stringify(s), before);
  assert.deepEqual(timed.technical!.timingSources, [{ id: s.id, version: 2, direction: '下跌' }]);
  assert.equal(timed.candles.at(-1)!.close, plain.candles.at(-1)!.close);
  assert.ok(Math.abs(timed.candles[2]!.close - plain.candles[2]!.close) <= .15 * timed.atr14 + 1e-8);
  assert.equal(projectTechnicalCandles(fixture(), [{ ...s, lockedAt: '2026-09-16T00:00:00Z' }], now)[0]!.windows.length, 0);
  for (const row of timed.candles) {
    assert.ok(row.low > 0 && row.low <= Math.min(row.open, row.close));
    assert.ok(row.high >= Math.max(row.open, row.close));
    assert.equal(row.volume, null);
  }
});
test('member wiring uses technical engine without order APIs; archives include 4h inputs', () => {
  const loader = readFileSync('lib/market-data/key-date-daily.server.ts', 'utf8');
  assert.match(loader, /projectTechnicalCandles\(data, paths, now, intraday\)/);
  assert.doesNotMatch(loader, /bitget|placeOrder|trading-signals/);
  const storage = readFileSync('lib/research/daily-candle-projection-storage.server.ts', 'utf8');
  assert.match(storage, /p.technical \?\? null/);
  assert.match(storage, /upsert: false/);
  const ui = readFileSync('components/member/MemberOperationDesk.tsx', 'utf8');
  assert.match(ui, /visibilitychange/);
  assert.match(ui, /300_000/);
  const route = readFileSync('app/api/member/key-date-chart/route.ts', 'utf8');
  assert.ok(route.indexOf('await requireMemberDeviceAccess') < route.indexOf('await getDailyProjection'));
});

test('chart support/resistance labels use the current 4h anchor without rewriting daily candles', () => {
  const data = fixture();
  const bars = data.bars.map((b, i) => ({ ...b, high: b.high + (i % 8 === 0 ? 20 : 0), low: b.low - (i % 7 === 0 ? 20 : 0) }));
  const before = JSON.stringify(bars);
  const reference = 650;
  const levels = chartLevelLadder(bars, reference);
  assert.ok(levels.supports.length > 0 && levels.resistances.length > 0);
  assert.ok(levels.supports.every(z => z.high < reference));
  assert.ok(levels.resistances.every(z => z.low > reference));
  assert.equal(JSON.stringify(bars), before);
  const band = levels.resistances[0]!;
  assert.deepEqual(chartLevelLadder(bars, (band.low + band.high) / 2).resistances[0], band);
  const terminal = readFileSync('components/member/ResearchCandleTerminal.tsx', 'utf8');
  assert.match(terminal, /chartLevelLadder\(data.bars, projection\?\.technical\?\.anchorPrice\)/);
  assert.equal(terminal.match(/chartLevelLadder\(data.bars, projection\?\.technical\?\.anchorPrice\)/g)?.length, 2);
  assert.doesNotMatch(terminal, /chartLevelLadder\(data.bars\)/);
});
