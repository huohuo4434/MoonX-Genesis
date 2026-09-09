import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DailyCandleChart } from '../components/member/DailyCandleChart';
import { buildMemberKeyDateRadar, keyDateChartForecasts } from '../lib/data/member-key-date-radar';
import { forecastPaths, forecastGeometry } from '../lib/presentation/forecast-path';
import { projectDailyCandles, PROJECTION_ENGINE, type DailyProjectionData } from '../lib/research/daily-candle-projection-core';
import { chartZones } from '../lib/presentation/key-date-chart';
import { addChartDays } from '../lib/presentation/chart-daily-session';

// tsx uses the repository's preserve JSX setting; provide the classic JSX runtime.
Object.assign(globalThis, { React });
const now = Date.parse('2026-09-09T12:00:00Z');
const items = buildMemberKeyDateRadar('2026-09-09');
const records = keyDateChartForecasts(items, now);
const paths = forecastPaths(items, records, '2026-09-09').filter(p => p.assetId === 'googl');
const bars = Array.from({ length: 80 }, (_, i) => {
  const date = addChartDays('2026-06-21', i), close = 300 + i / 10 + Math.sin(i) * 2;
  return { date, timestamp: Date.parse(`${date}T00:00:00Z`), open: close - .3, high: close + 2, low: close - 2, close, volume: 100 };
});
const quote = { assetId: 'googl', quoteSymbol: 'GOOGL', timeZone: 'America/New_York', bars,
  ...chartZones(bars), asOf: '2026-09-08', source: 'TEST_ONLY', stale: false };
const data: DailyProjectionData = { ...quote, projections: projectDailyCandles(quote, paths, now), checkedAt: new Date(now).toISOString(),
  expectedAsOf: quote.asOf, projectionDate: '2026-09-09', engine: PROJECTION_ENGINE, archiveStatus: 'NOT_APPLICABLE', archiveId: null };

test('Google current weekly source and three-month background remain distinct and immutable', () => {
  const before = JSON.stringify({ records, paths });
  const week = data.projections.find(p => p.level === 'WEEK')!;
  const month = data.projections.find(p => p.level === 'MONTH')!;
  assert.equal(week.sourceId, 'GOOGL-W5-20260907-V1');
  assert.equal(week.direction, '震荡下跌');
  assert.deepEqual([week.sourcePeriodStart, week.sourcePeriodEnd], ['2026-09-07', '2026-09-13']);
  assert.equal(month.sourceId, 'GOOGL-M3-20260901-V1');
  assert.equal(month.direction, '震荡');
  assert.deepEqual([month.sourcePeriodStart, month.sourcePeriodEnd], ['2026-09-01', '2026-11-30']);
  assert.notEqual(month.candles.at(-1)!.date, month.sourcePeriodEnd);
  projectDailyCandles(quote, paths, now);
  assert.equal(JSON.stringify({ records, paths }), before);
});

test('neutral direction has no manufactured central turn but retains valid varied candle shapes', () => {
  const neutral = paths.find(p => p.direction === '震荡')!;
  assert.deepEqual(forecastGeometry(neutral, neutral.periodStart).points.map(p => p.value), [0, 0]);
  const candles = data.projections.find(p => p.direction === '震荡')!.candles;
  assert.ok(candles.every(c => c.baselineClose === bars.at(-1)!.close));
  assert.ok(new Set(candles.map(c => c.close)).size > 1);
  assert.ok(candles.every(c => c.low <= Math.min(c.open, c.close) && c.high >= Math.max(c.open, c.close)));
  assert.match(PROJECTION_ENGINE, /v4-horizon/);
});

test('Chinese and English default to weekly even when monthly projection is first', () => {
  const monthlyFirst = { ...data, projections: [...data.projections].sort((a, b) => a.level.localeCompare(b.level)) };
  for (const en of [false, true]) {
    const html = renderToStaticMarkup(React.createElement(DailyCandleChart, { data: monthlyFirst, en }));
    assert.match(html, /data-selected-forecast="GOOGL-W5-20260907-V1"/);
    assert.match(html, /2026-09-07—2026-09-13/);
    assert.match(html, /2026-09-01—2026-11-30/);
    assert.ok(html.includes(en ? 'Multi-month background' : '多月背景'));
    assert.ok(html.includes(en ? 'Plotted simulation dates' : '图中模拟日期'));
  }
});

test('long-only fallback labels neutral simulation; legacy archives do not invent source dates', () => {
  const projections = data.projections.filter(p => p.level === 'MONTH');
  const html = renderToStaticMarkup(React.createElement(DailyCandleChart, { data: { ...data, projections }, en: false }));
  assert.match(html, /震荡不代表先跌后涨/);
  const legacy = projections.map(p => ({ ...p, sourcePeriodStart: undefined, sourcePeriodEnd: undefined }));
  const oldHtml = renderToStaticMarkup(React.createElement(DailyCandleChart, { data: { ...data, projections: legacy }, en: true }));
  assert.match(oldHtml, /Source period unavailable/);
  assert.doesNotMatch(oldHtml, /Multi-month background/);
});
