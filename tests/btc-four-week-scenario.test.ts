import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { projectTechnicalCandles } from '../lib/research/technical-candle-outlook';
import { BTC_PULLBACK_REVIEW } from '../lib/research/btc-four-week-scenario';
import { chartZones, type KeyDateChartData } from '../lib/presentation/key-date-chart';

const now = Date.parse('2026-09-20T12:00:00Z');
function fixture(date = '2026-09-19', close = 80311.61): KeyDateChartData {
  const bars = Array.from({ length: 100 }, (_, i) => {
    const timestamp = Date.parse(date) - (99 - i) * 86400000;
    const value = close - (99 - i) * 100 + (i === 99 ? 0 : Math.sin(i) * 300);
    return { timestamp, date: new Date(timestamp).toISOString().slice(0, 10),
      open: value - 100, close: value, high: value + 500, low: value - 500, volume: 100 };
  });
  return { assetId: 'btc', quoteSymbol: 'BTCUSDT', timeZone: 'UTC', source: 'TEST_ONLY',
    bars, ...chartZones(bars), asOf: date, stale: false };
}
test('default four-week path actually consolidates then declines; technical baseline and inputs retained', () => {
  const data = fixture(), before = JSON.stringify(data);
  const rows = projectTechnicalCandles(data, [], now);
  const months = rows.filter(p => p.level === 'MONTH');
  assert.equal(months.length, 2);
  const scenario = months[0]!;
  assert.equal(scenario.direction, '先涨后跌');
  assert.equal(scenario.researchScenario?.status, 'CONDITIONAL');
  assert.equal(months[1]!.researchScenario, undefined);
  assert.equal(rows[0]!.level, 'WEEK');
  assert.equal(rows[0]!.researchScenario, undefined);
  assert.equal(JSON.stringify(data), before);
  assert.equal(scenario.sourcePeriodEnd, '2026-10-17');
  assert.equal(scenario.candles.find(c => c.date === '2026-09-26')!.close, 81478.87);
  assert.equal(scenario.candles.at(-1)!.close, 76264);
  assert.equal(scenario.candles[0]!.open, 80311.61);
  for (const [i, c] of scenario.candles.entries()) {
    assert.ok(c.high >= Math.max(c.open, c.close));
    assert.ok(c.low > 0 && c.low <= Math.min(c.open, c.close));
    assert.equal(c.volume, null);
    if (i) assert.equal(c.open, scenario.candles[i - 1]!.close);
  }
  assert.deepEqual(rows, projectTechnicalCandles(data, [], now));
});
test('no backdating, wrong instruments, stale data or perpetual rolling phase', () => {
  assert.equal(projectTechnicalCandles(fixture(), [], Date.parse(BTC_PULLBACK_REVIEW.publishedAfter) - 1).length, 2);
  for (const change of [{ assetId: 'eth' }, { quoteSymbol: 'BTCUSD' }, { timeZone: 'America/New_York' }]) {
    assert.ok(projectTechnicalCandles({ ...fixture(), ...change }, [], now).every(p => !p.researchScenario));
  }
  assert.deepEqual(projectTechnicalCandles({ ...fixture(), stale: true }, [], now), []);
  const later = projectTechnicalCandles(fixture('2026-10-04', 78000), [], Date.parse('2026-10-05T12:00:00Z'));
  const scenario = later.find(p => p.researchScenario)!;
  assert.equal(scenario.researchScenario!.status, 'SUPPORT_LOST');
  assert.equal(scenario.candles.at(-1)!.date, '2026-10-17');
  assert.ok(scenario.candles.every(c => c.baselineClose <= 78000));
  assert.ok(projectTechnicalCandles(fixture('2026-10-17'), [], Date.parse('2026-10-18T12:00:00Z')).every(p => !p.researchScenario));
});
test('boundary crossings withdraw synthetic bearish path, including a prior post-publication daily breach', () => {
  for (const close of [82300, 85000, 74967.97, 73000]) {
    const rows = projectTechnicalCandles(fixture('2026-09-19', close), [], now);
    assert.equal(rows.length, 2);
    assert.equal(rows[1]!.researchScenario!.status, 'WITHDRAWN');
    assert.match(rows[1]!.sourceId, /withdrawn$/);
  }
  const data = fixture('2026-09-23');
  Object.assign(data.bars.at(-2)!, { open: 82400, close: 82500, high: 83000, low: 82000 });
  assert.equal(projectTechnicalCandles(data, [], Date.parse('2026-09-24T12:00:00Z'))[1]!.researchScenario!.status, 'WITHDRAWN');
});
test('member display explains assumptions and withdrawal; helper cannot submit trades', () => {
  const ui = readFileSync('components/member/DailyCandleChart.tsx', 'utf8');
  assert.match(ui, /data-btc-pullback-scenario/);
  assert.match(ui, /高位整理后回调/);
  assert.match(ui, /支撑失守尚未确认/);
  const helper = readFileSync('lib/research/btc-four-week-scenario.ts', 'utf8');
  assert.doesNotMatch(helper, /bitget|placeOrder|trading-signals|fetch\(/);
});
