import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { buildSourceResearch, researchWindow, SOURCE_RESEARCH_POLICY } from '../lib/research/source-research-view';
import type { ForecastPath } from '../lib/presentation/forecast-path';
import type { DailyProjectionData } from '../lib/research/daily-candle-projection-core';
import { DailyCandleChart } from '../components/member/DailyCandleChart';
Object.assign(globalThis, { React });
const now = Date.parse('2026-09-27T09:00Z');
const weekly: ForecastPath = { id: 'test-week', assetId: 'btc', level: 'WEEK', sourceHorizon: 'WEEK', direction: '震荡下跌',
  periodStart: '2026-09-22', periodEnd: '2026-09-29', lockedAt: '2026-09-20T00:00Z', version: 1, windows: [] };
const month: ForecastPath = { ...weekly, id: 'test-month', level: 'MONTH', sourceHorizon: 'MONTH', direction: '震荡', periodStart: '2026-09-01', periodEnd: '2026-10-07' };
test('sources keep original direction/version/period and reject other assets, expired and unpublished records', () => {
  const paths = [weekly, month, { ...weekly, assetId: 'eth' }, { ...weekly, lockedAt: '2026-09-28T00:00Z' }, { ...weekly, periodEnd: '2026-09-26' }];
  const before = JSON.stringify(paths);
  const r = buildSourceResearch('btc', paths, '2026-09-27', now);
  assert.equal(r.records.length, 2);
  assert.deepEqual(r.records.find(p => p.id === weekly.id), { ...weekly, phases: undefined });
  assert.equal(JSON.stringify(paths), before);
  assert.doesNotMatch(JSON.stringify(r), /candles|targetPrice|technicalScore/);
});
test('weekly gaps are not filled by monthly background and four-week gaps stay explicit', () => {
  const r = buildSourceResearch('btc', [weekly, month], '2026-09-27', now);
  assert.deepEqual(researchWindow(r, 'WEEK').gaps, [{ start: '2026-09-30', end: '2026-10-03' }]);
  assert.deepEqual(researchWindow(r, 'MONTH').gaps, [{ start: '2026-10-08', end: '2026-10-24' }]);
});
test('passed and derived dates never become new turning dates', () => {
  const w = { id: 'date', assetId: 'btc', symbol: 'BTC', level: 'WEEK' as const, startDate: '2026-09-28', endDate: '2026-09-28', focusDate: '2026-09-28', kind: 'risk' as const, closed: false, nextSessionDate: null };
  const r = buildSourceResearch('btc', [{ ...weekly, windows: [{ ...w, evidence: 'DERIVED' }, { ...w, evidence: 'EXPLICIT', focusDate: '2026-09-26' }, { ...w, evidence: 'EXPLICIT', id: 'kept' }] }], '2026-09-27', now);
  assert.deepEqual(r.records[0].windows.map(x => x.id), ['kept']);
});
const bar = { timestamp: Date.parse('2026-09-26'), date: '2026-09-26', open: 84100, high: 84474, low: 83798, close: 84433, volume: 100 };
const data: DailyProjectionData = { assetId: 'btc', quoteSymbol: 'BTCUSDT', source: 'TEST', timeZone: 'UTC', bars: [bar], support: null, resistance: null,
  asOf: bar.date, stale: false, checkedAt: new Date(now).toISOString(), expectedAsOf: bar.date, projectionDate: '2026-09-27', engine: SOURCE_RESEARCH_POLICY, projections: [], archiveId: null, archiveStatus: 'NOT_APPLICABLE' };
test('both layouts/languages ignore stale synthetic payloads and preserve actual OHLC/indicators', () => {
  const legacy = { ...data, projections: [{ sourceId: 'untrusted-old', direction: '上涨', level: 'WEEK', candles: [{ ...bar, date: '2026-10-03', close: 999999.99 }] }] } as DailyProjectionData;
  for (const compact of [true, false]) for (const en of [true, false]) {
    const html = renderToStaticMarkup(React.createElement(DailyCandleChart, { data: legacy, en, compact }));
    assert(!html.includes('999,999.99'));
    assert(!html.includes('untrusted-old'));
    assert(!html.includes('未来模拟区') && !html.includes('SIMULATED · NOT ACTUAL'));
    assert(!html.includes('放大预测区') && !html.includes('Focus forecast'));
    assert(html.includes('84,433') && html.includes('MACD (12,26,9)'));
    assert(html.includes(en ? 'Source data is not verified' : '研究来源待核验'));
  }
});
test('source display keeps gaps, dates, context and BTC-only editorial separation', () => {
  const current = { ...data, research: buildSourceResearch('btc', [weekly, month], '2026-09-27', now),
    editorialContext: { version: 'test-annual', reviewDate: '2026-09-27', months: [{ month: '2026-10', zh: '条件回撤', en: 'Conditional pullback', origin: 'USER_SCENARIO', watchZh: '不是每日目标', watchEn: 'Not daily targets' }] } };
  const html = renderToStaticMarkup(React.createElement(DailyCandleChart, { data: current, en: false }));
  assert.match(html, /2026-09-22—2026-09-29/);
  assert.match(html, /2026-09-30—2026-10-03/);
  assert.match(html, /条件回撤/);
  assert.match(html, /震荡下跌/);
  const eth = renderToStaticMarkup(React.createElement(DailyCandleChart, { data: { ...current, assetId: 'eth' }, en: true }));
  assert(!eth.includes('Conditional pullback'));
  assert(eth.includes('BTC annual windows do not establish'));
});
test('production loader cannot synthesize prices; membership gate and immutable archive remain', () => {
  const read = (file: string) => readFileSync(file, 'utf8');
  const loader = read('lib/market-data/key-date-daily.server.ts');
  assert.doesNotMatch(loader, /projectTechnicalCandles|loadChartFourHour|projectDailyCandles|bitget|placeOrder/);
  assert.match(loader, /projections: \[\]/);
  assert.match(loader, /buildSourceResearch\(assetId, paths/);
  assert.match(read('lib/research/daily-candle-projection-core.ts'), /source-research-only-20260927/);
  const route = read('app/api/member/key-date-chart/route.ts');
  assert(route.indexOf('await requireMemberDeviceAccess') < route.indexOf('await getDailyProjection'));
  assert.match(read('lib/research/daily-candle-projection-storage.server.ts'), /if \(data.stale \|\| !data.projections.length\) return data/);
});
