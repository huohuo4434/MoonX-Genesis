import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { buildMemberKeyDateRadar, keyDateChartForecasts } from '../lib/data/member-key-date-radar';
import { forecastPaths } from '../lib/presentation/forecast-path';
import { chartCalendarSupported, isChartTradingDay } from '../lib/presentation/chart-market-calendar';
import { expectedClosedSession } from '../lib/presentation/chart-daily-session';
import { parseOrderlyDaily, SPCX_ORDERLY_SYMBOL } from '../lib/market-data/chart-special-daily';
import { projectionCoverage } from '../lib/research/daily-candle-projection-core';

test('TSLA legacy slots resolve stage and all three late September weeks, without modifying records', () => {
  for (const [date, week] of [['2026-09-06', 'W4'], ['2026-09-14', 'W5'], ['2026-09-21', 'W6'], ['2026-09-28', 'W7']]) {
    const items = buildMemberKeyDateRadar(date!);
    const rows = keyDateChartForecasts(items, Date.parse(`${date}T12:00:00Z`));
    const before = JSON.stringify(rows);
    const paths = forecastPaths(items, rows, date!).filter(p => p.assetId === 'tsla');
    assert.ok(paths.some(p => p.id.startsWith(`TSLA-${week}-`) && p.level === 'WEEK'));
    assert.ok(paths.some(p => p.id === 'TSLA-7W-20260817-V1' && p.sourceHorizon === 'STAGE'));
    assert.equal(rows.find(p => p.id === 'TSLA-7W-20260817-V1')?.forecastType, 'YEAR_1');
    assert.equal(JSON.stringify(rows), before);
  }
});
test('metals use verified September trade dates, SSE differs from NYSE, and SPCX is UTC quotes', () => {
  for (const asset of ['gold','silver','wti-crude']) {
    assert.equal(chartCalendarSupported(asset, '2026-09-08'), true);
    assert.equal(isChartTradingDay(asset, '2026-09-07'), false);
    assert.equal(chartCalendarSupported(asset, '2026-10-01'), false);
    assert.equal(expectedClosedSession(asset, 'America/New_York', Date.parse('2026-09-08T12:00:00Z')), '2026-09-04');
  }
  assert.equal(isChartTradingDay('cxmt', '2026-09-07'), true);
  assert.equal(isChartTradingDay('cxmt', '2026-09-25'), false);
  assert.equal(isChartTradingDay('cxmt', '2026-09-20'), false);
  assert.equal(isChartTradingDay('cxmt', '2026-10-02'), false);
  assert.equal(isChartTradingDay('spcx', '2026-09-06'), true);
  assert.equal(expectedClosedSession('spcx', 'UTC', Date.parse('2026-09-06T01:00:00Z')), '2026-09-05');
  assert.equal(expectedClosedSession('cxmt', 'Asia/Shanghai', Date.parse('2026-09-04T07:31:00Z')), '2026-09-04');
});
test('Orderly exact symbol, closed UTC bars, valid zero volume, malformed and future rows fail closed', () => {
  assert.equal(SPCX_ORDERLY_SYMBOL, 'PERP_SPCX_USDC_mythos');
  const now = Date.parse('2026-09-06T01:00:00Z');
  const p = {s:'ok', t:[1788566400,1788652800],o:[147,150],h:[151,152],l:[146,149],c:[150,151],v:[0,1]};
  const bars = parseOrderlyDaily(p, now);
  assert.equal(bars.length, 1);
  assert.equal(bars[0]!.volume, 0);
  assert.equal(parseOrderlyDaily({...p,o:[147]},now).length,0);
  assert.equal(parseOrderlyDaily({...p,s:'error'},now).length,0);
  assert.equal(parseOrderlyDaily({...p,h:[140,152]},now).length,0);
});
test('missing horizon is distinguished from missing price history and UI explains instrument types', () => {
  const data = {assetId:'tsla',quoteSymbol:'TSLA',timeZone:'America/New_York',bars:[],support:null,resistance:null,asOf:'2026-09-04',source:'test',stale:false};
  assert.deepEqual(projectionCoverage(data, [], [], Date.parse('2026-09-06T12:00:00Z')), {MONTH:'NO_SOURCE',WEEK:'NO_SOURCE'});
  const ui = readFileSync('components/member/DailyCandleChart.tsx','utf8');
  assert.doesNotMatch(ui, /该周期暂无可用正式预测、已核验交易日历或充足闭合K线/);
  assert.match(ui, /阶段预测K线/);
  assert.match(ui, /零成交量K线可能来自盘口报价/);
  const loader = readFileSync('lib/market-data/key-date-daily.server.ts','utf8');
  for (const value of ['spcx: SPCX_ORDERLY_SYMBOL','asteroid: ASTEROID_TOKEN',"cxmt: '688825.SS'"]) assert.ok(loader.includes(value));
});
