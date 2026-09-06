import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { projectDailyCandles, dailyVolatility } from "../lib/research/daily-candle-projection-core";
import { expectedClosedSession, finalizedChartBars, addChartDays } from "../lib/presentation/chart-daily-session";
import { chartZones, chartWindow, type KeyDateChartData } from "../lib/presentation/key-date-chart";
import type { ForecastPath } from "../lib/presentation/forecast-path";
import { parseChartUtcCandles } from '../lib/market-data/chart-crypto-utc';
import { isChartTradingDay, chartCalendarSupported } from '../lib/presentation/chart-market-calendar';

test('UTC8 and incomplete crypto daily bars are rejected, UTC midnight closed bars accepted', () => {
  const utc = Date.parse('2026-09-05T00:00:00Z');
  const rows = [utc, utc + 16 * 3600000, utc + 86400000].map(ts => [ts,'100','102','98','101','100',0,0,'1']);
  assert.equal(parseChartUtcCandles(rows, Date.parse('2026-09-06T01:00:00Z'), true).length, 1);
  assert.equal(parseChartUtcCandles([[utc,'100','102','98','101','100',0,0,'0']], utc + 86400000, true).length, 0);
});
test('verified 2026 exchange holidays and unsupported future years fail closed', () => {
  assert.equal(isChartTradingDay('tencent', '2026-10-02'), true);
  assert.equal(isChartTradingDay('tencent', '2026-10-19'), false);
  assert.equal(isChartTradingDay('sandisk', '2026-04-03'), false);
  assert.equal(isChartTradingDay('sandisk', '2026-06-19'), false);
  assert.equal(chartCalendarSupported('sandisk', '2027-01-04'), false);
  assert.equal(chartCalendarSupported('gold', '2026-09-08'), false);
  assert.equal(chartCalendarSupported('btc', '2027-01-04'), true);
  const p = { ...path('sandisk'), periodStart: '2027-01-01', periodEnd: '2027-01-31' };
  assert.deepEqual(projectDailyCandles(fixture('sandisk'), [p], Date.parse('2027-01-01T01:00:00Z')), []);
});
test('legacy chartWindow calendar annotations are re-derived for research without mutating source dates', () => {
  for (const date of ['2026-10-02', '2026-10-19']) {
    const window = chartWindow({ id: date, assetId: 'tencent', symbol: '0700.HK', focusDate: date,
      startDate: date, endDate: date, level: 'MONTH', evidence: 'EXPLICIT', sourceDateType: '阶段高点', action: 'TOP_EXIT_WATCH' } as Parameters<typeof chartWindow>[0]);
    const p = { ...path('tencent'), periodStart: '2026-10-01', periodEnd: '2026-10-30', windows: [window] };
    const before = JSON.stringify(p);
    const result = projectDailyCandles({ ...fixture('tencent'), timeZone: 'Asia/Hong_Kong' }, [p], Date.parse('2026-10-01T01:00:00Z'))[0]!;
    assert.equal(result.windows[0]!.focusDate, date);
    assert.equal(result.windows[0]!.closed, date === '2026-10-19');
    assert.equal(result.windows[0]!.nextSessionDate, date === '2026-10-19' ? '2026-10-20' : null);
    assert.equal(JSON.stringify(p), before);
  }
});

function fixture(asset = "btc"): KeyDateChartData {
  const bars = Array.from({ length: 80 }, (_, i) => ({ date: addChartDays("2026-06-18", i), timestamp: Date.parse(`${addChartDays("2026-06-18", i)}T00:00:00Z`),
    open: 100 + i / 10, close: 100 + i / 10 + .2, high: 102 + i / 10, low: 98 + i / 10, volume: 100 }));
  return { assetId: asset, quoteSymbol: asset === "btc" ? "BTCUSDT" : "SNDK", timeZone: asset === "btc" ? "UTC" : "America/New_York",
    bars, ...chartZones(bars), asOf: bars.at(-1)!.date, source: "TEST_ONLY", stale: false };
}
function path(asset = "btc", direction = "先涨后跌"): ForecastPath {
  return { id: "published-month", assetId: asset, direction: direction as ForecastPath["direction"], level: "MONTH", periodStart: "2026-09-01", periodEnd: "2026-09-30", version: 3,
    lockedAt: "2026-08-28T12:00:00Z", windows: [] };
}
const now = Date.parse("2026-09-06T01:00:00Z");

test("closed daily data changes after equity close buffer, not on partial session; crypto UTC", () => {
  assert.equal(expectedClosedSession("sandisk", "America/New_York", Date.parse("2026-09-04T19:59:00Z")), "2026-09-03");
  assert.equal(expectedClosedSession("sandisk", "America/New_York", Date.parse("2026-09-04T20:31:00Z")), "2026-09-04");
  assert.equal(expectedClosedSession("sandisk", "America/New_York", Date.parse("2026-09-07T22:00:00Z")), "2026-09-04");
  assert.equal(expectedClosedSession("sandisk", "America/New_York", Date.parse("2026-12-01T21:31:00Z")), "2026-12-01");
  assert.equal(expectedClosedSession("tencent", "Asia/Hong_Kong", Date.parse("2026-09-04T08:31:00Z")), "2026-09-04");
  assert.equal(expectedClosedSession("btc", "UTC", Date.parse("2026-09-06T00:01:00Z")), "2026-09-05");
  const bar = { timestamp: Date.parse("2026-09-04T13:30:00Z"), open: 100, high: 102, low: 98, close: 101, volume: null };
  assert.equal(finalizedChartBars([bar], "sandisk", "America/New_York", Date.parse("2026-09-04T20:00:00Z")).length, 0);
  assert.equal(finalizedChartBars([bar], "sandisk", "America/New_York", Date.parse("2026-09-04T20:31:00Z")).length, 1);
});
test("forecast candles are deterministic valid OHLC with real-valued scale and future dates", () => {
  const data = fixture();
  const before = JSON.stringify(data);
  const rows = projectDailyCandles(data, [path()], now);
  assert.equal(rows.length, 1);
  assert.equal(rows[0]!.candles[0]!.open, data.bars.at(-1)!.close);
  assert.equal(rows[0]!.dateBasis, "MODEL_PHASE_ALLOCATION");
  for (const bar of rows[0]!.candles) {
    assert.ok(bar.date > data.asOf);
    assert.ok(bar.date >= "2026-09-06" && bar.date <= "2026-09-30");
    assert.ok(bar.low > 0 && bar.low <= Math.min(bar.open, bar.close));
    assert.ok(bar.high >= Math.max(bar.open, bar.close));
    assert.ok([bar.open, bar.high, bar.low, bar.close, bar.rangeHigh, bar.rangeLow].every(Number.isFinite));
    assert.equal(bar.volume, null);
  }
  assert.deepEqual(rows, projectDailyCandles(data, [path()], now));
  assert.equal(JSON.stringify(data), before);
});
test("stale, missing source, inadequate data and future locked forecasts never get synthetic candles", () => {
  assert.deepEqual(projectDailyCandles({ ...fixture(), stale: true }, [path()], now), []);
  assert.deepEqual(projectDailyCandles(fixture(), [], now), []);
  assert.deepEqual(projectDailyCandles({ ...fixture(), bars: fixture().bars.slice(-3) }, [path()], now), []);
  assert.deepEqual(projectDailyCandles(fixture(), [{ ...path(), lockedAt: "2026-10-01T00:00:00Z" }], now), []);
  assert.equal(dailyVolatility([]), null);
});
test("SNDK has no weekend or Labor Day synthetic candle; strength anchor is moved to actual session", () => {
  const p = path("sandisk", "先跌后涨");
  p.windows = [{ id: "s", assetId: "sandisk", symbol: "SNDK", level: "MONTH", evidence: "EXPLICIT", startDate: "2026-09-07", endDate: "2026-09-07", focusDate: "2026-09-07", kind: "strength", closed: true, nextSessionDate: "2026-09-08" }];
  const result = projectDailyCandles(fixture("sandisk"), [p], now)[0]!;
  assert.equal(result.dateBasis, "EXPLICIT_WINDOW");
  assert.equal(result.candles[0]!.date, "2026-09-08");
  assert.ok(result.candles.every(b => ![0, 6].includes(new Date(`${b.date}T12:00:00Z`).getUTCDay())));
});
test("elapsed high is not moved into the future on daily updates", () => {
  const p = path();
  p.windows = [{ id: "h", assetId: "btc", symbol: "BTC", level: "MONTH", evidence: "EXPLICIT", startDate: "2026-09-10", endDate: "2026-09-10", focusDate: "2026-09-10", kind: "high", closed: false, nextSessionDate: null }];
  const data = fixture();
  const tail = data.bars.at(-1)!;
  data.bars = [...data.bars, { ...tail, date: "2026-09-11", timestamp: Date.parse("2026-09-11T00:00:00Z") }];
  data.asOf = "2026-09-11";
  const result = projectDailyCandles(data, [p], Date.parse("2026-09-12T01:00:00Z"))[0]!;
  assert.ok(result.candles.every(b => b.close <= b.open));
  assert.equal(result.windows[0]!.focusDate, "2026-09-10");
});
test("daily re-computation reacts to a new closed price and preserves source directions", () => {
  const data = fixture();
  const before = projectDailyCandles(data, [path()], now);
  const last = data.bars.at(-1)!;
  const next = { ...data, bars: [...data.bars, { ...last, date: "2026-09-06", timestamp: now, close: 106, high: 111, low: 104 }], asOf: "2026-09-06" };
  const after = projectDailyCandles(next, [path()], now + 86_400_000);
  assert.equal(after[0]!.candles[0]!.open, 106);
  assert.equal(after[0]!.direction, before[0]!.direction);
  assert.notDeepEqual(after[0]!.candles, before[0]!.candles);
});
test("cron, private archive and UI freshness have independent fail-closed wiring", () => {
  const cron = readFileSync("app/api/cron/daily-candle-projections/route.ts", "utf8");
  assert.match(cron, /!secret \|\| request.headers.get/);
  assert.ok(cron.indexOf('status: 401') < cron.indexOf('await refreshAllDailyProjections'));
  assert.match(cron, /result.ok \? 200 : 503/);
  assert.doesNotMatch(cron, /bitget|trading-signals/);
  const storage = readFileSync("lib/research/daily-candle-projection-storage.server.ts", "utf8");
  assert.match(storage, /upsert: false/);
  assert.match(storage, /bucket.public/);
  assert.doesNotMatch(storage, /upsert: true|createSignedUrl|getPublicUrl/);
  const ui = readFileSync("components/member/KeyDatePriceChart.tsx", "utf8");
  assert.match(ui, /setInterval\(refresh, 5 \* 60_000\)/);
  assert.match(ui, /visibilitychange/);
  assert.match(ui, /data\?\.projectionDate/);
  const chart = readFileSync("components/member/DailyCandleChart.tsx", "utf8");
  assert.match(chart, /未模拟跳空/);
  assert.match(chart, /MODEL_PHASE_ALLOCATION/);
  assert.match(chart, /尚未验证准确率/);
  assert.match(chart, /data.archiveStatus === "UNAVAILABLE"/);
});
