import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { chartLevelLadder, chartWindow, chartZones, closedChartBars, type ChartBar } from "../lib/presentation/key-date-chart";
import type { KeyDateRadarItem } from "../lib/data/key-date-radar-core";

test("only valid closed exchange dates, sorted and deduplicated", () => {
  const bar = { timestamp: Date.parse("2026-09-04T13:30:00Z"), open: 100, high: 110, low: 90, close: 105, volume: 10 };
  const rows = closedChartBars([bar, { ...bar, close: 106 }, { ...bar, low: -1 },
    { ...bar, timestamp: Date.parse("2026-09-05T13:30:00Z") }], "America/New_York", Date.parse("2026-09-05T21:00:00Z"));
  assert.equal(rows.length, 1);
  assert.equal(rows[0]!.date, "2026-09-04");
  assert.equal(rows[0]!.close, 106);
});
test("daily zones need repeated confirmed pivots and do not invent a zone", () => {
  const bars: ChartBar[] = Array.from({ length: 40 }, (_, i) => ({ timestamp: i, date: String(i), open: 100, close: 100,
    high: [104, 105, 110, 105, 104][i % 5]!, low: [96, 95, 90, 95, 96][i % 5]!, volume: 1 }));
  const result = chartZones(bars);
  assert.equal(result.support?.low, 90);
  assert.equal(result.resistance?.high, 110);
  assert.ok(result.support!.touches >= 2);
  assert.deepEqual(chartZones(bars.slice(0, 10)), { support: null, resistance: null });
  assert.deepEqual(chartZones(bars.map(b => ({ ...b, low: 90, high: 110 }))), { support: null, resistance: null });
});
test("keep source meaning, holiday and source date without automatic buy/sell mapping", () => {
  const item = { id: "test", assetId: "sandisk", symbol: "SNDK", startDate: "2026-09-07", endDate: "2026-09-10",
    focusDate: "2026-09-07", action: "BOTTOM_WATCH", sourceDateType: "上涨候选", level: "MONTH", evidence: "EXPLICIT" } as KeyDateRadarItem;
  const before = JSON.stringify(item);
  const view = chartWindow(item);
  assert.equal(view.kind, "strength");
  assert.equal(view.closed, true);
  assert.equal(view.nextSessionDate, "2026-09-08");
  assert.equal(view.focusDate, "2026-09-07");
  assert.equal(JSON.stringify(item), before);
  assert.equal(chartWindow({ ...item, sourceDateType: "波动放大" }).kind, "watch");
  assert.equal(chartWindow({ ...item, sourceDateType: "阶段低点" }).kind, "low");
});
test("member route authorizes before fetching and cannot mutate or accept arbitrary URLs", () => {
  const route = readFileSync("app/api/member/key-date-chart/route.ts", "utf8");
  assert.ok(route.indexOf('gate.status !== "ALLOWED"') < route.indexOf("await getDailyProjection"));
  assert.match(route, /checkMemberApiRateLimit/);
  assert.match(route, /Object.hasOwn\(symbols, assetId\)/);
  assert.match(route, /private, no-store/);
  assert.doesNotMatch(route, /export async function (POST|DELETE|PUT|PATCH)/);
});

test("ladder retains up to five real levels on each side in distance order", () => {
  const bars: ChartBar[] = Array.from({ length: 80 }, (_, i) => ({ timestamp: i, date: String(i), open: 1000, close: 1000,
    high: i < 60 && i % 6 === 2 ? 1005 + Math.floor(i / 6) * 5 : 1001,
    low: i < 60 && i % 6 === 4 ? 995 - Math.floor(i / 6) * 5 : 999, volume: 1 }));
  const before = JSON.stringify(bars);
  const ladder = chartLevelLadder(bars);
  assert.equal(ladder.supports.length, 5);
  assert.equal(ladder.resistances.length, 5);
  assert.deepEqual(ladder.resistances.map(z => z.low), [1005,1010,1015,1020,1025]);
  assert.deepEqual(ladder.supports.map(z => z.high), [995,990,985,980,975]);
  assert.ok(ladder.resistances.every(z => z.touches === 1));
  assert.equal(JSON.stringify(bars), before);
  const breakout = [...bars.slice(0, -1), { ...bars.at(-1)!, close: 1012, high: 1013 }];
  const moved = chartLevelLadder(breakout);
  assert.equal(moved.resistances[0]!.low, 1015);
  assert.equal(moved.supports[0]!.high, 1010);
  const newHigh = [...bars.slice(0, -1), { ...bars.at(-1)!, close: 1100, high: 1101 }];
  assert.equal(chartLevelLadder(newHigh).resistances.length, 0);
  assert.deepEqual(chartLevelLadder(bars.slice(0, 10)), { supports: [], resistances: [] });
  assert.deepEqual(chartLevelLadder([]), { supports: [], resistances: [] });
});

test("ladder clusters repeated pivots and excludes unconfirmed final bars", () => {
  const bars: ChartBar[] = Array.from({ length: 40 }, (_, i) => ({ timestamp: i, date: String(i), open: 100, close: 100,
    high: [104,105,110,105,104][i % 5]!, low: [96,95,90,95,96][i % 5]!, volume: 1 }));
  bars[39]!.high = 150;
  const ladder = chartLevelLadder(bars);
  assert.equal(ladder.resistances.length, 1);
  assert.equal(ladder.resistances[0]!.high, 110);
  assert.ok(ladder.resistances[0]!.touches >= 2);
  const component = readFileSync('components/member/ResearchCandleTerminal.tsx', 'utf8');
  assert.match(component, /chartLevelLadder\(data.bars\)/);
  assert.doesNotMatch(component, /chartLevelLadder\(.*candles/);
  assert.match(component, /data-price-level-ladder="v1"/);
});
