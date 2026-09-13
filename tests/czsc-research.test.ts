import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { technicalChartContext } from "../lib/research/technical-chart-context";
import { czscInput, validateCzscSnapshot } from "../lib/research/czsc-research-contract";
import type { KeyDateChartData } from "../lib/presentation/key-date-chart";

const data: KeyDateChartData = { assetId: "test", quoteSymbol: "TEST", source: "synthetic test only", timeZone: "UTC", stale: false,
  asOf: "2025-04-10", support: null, resistance: null, bars: Array.from({ length: 100 }, (_, i) => {
    const timestamp = Date.parse("2025-01-01T00:00:00Z") + i * 86400000;
    const close = 100 + Math.sin(i / 4) * 10;
    return { timestamp, date: new Date(timestamp).toISOString().slice(0, 10), open: close, close, high: close+2, low: close-2, volume: null };
  }) };

test("MACD seeds 26-bar DIF then 9 real DIFs, and uses no future bars", () => {
  const linear = data.bars.map((b, i) => ({ ...b, close: i + 1 }));
  const ctx = technicalChartContext(linear);
  assert.equal(ctx.points[0]!.date, linear[33]!.date);
  assert.ok(Math.abs(ctx.points[0]!.dif - 7) < 1e-10);
  assert.ok(Math.abs(ctx.points[0]!.dea - 7) < 1e-10);
  const prefix = technicalChartContext(data.bars.slice(0, 70));
  const all = technicalChartContext(data.bars);
  assert.deepEqual(prefix.points, all.points.filter(p => p.date <= data.bars[69]!.date));
  assert.equal(technicalChartContext(data.bars.slice(0, 59)).ema60, null);
  assert.equal(technicalChartContext([]).zeroAxis, "UNAVAILABLE");
  assert.equal(technicalChartContext(data.bars.slice(0, 33)).points.length, 0);
});

test("CZSC accepts only pinned research reports tied to exact chart candles", async () => {
  const input = czscInput(data);
  const report = { schema: "moox-czsc-v1", engine: "czsc-1.0.1", authority: "RESEARCH_ONLY", tradingEligible: false,
    symbol: "TEST", timeframe: "1D", asOf: data.asOf, minBiLen: 6,
    inputHash: createHash("sha256").update(input.barsJson).digest("hex"), strokes: [], zones: [],
    replay: { bars: 100, additions: 0, revisions: 0, profitBacktested: false } };
  assert.equal((await validateCzscSnapshot(report, data)).engine, "czsc-1.0.1");
  for (const patch of [{ authority: "LIVE" }, { engine: "czsc-0.9" }, { tradingEligible: true }, { symbol: "BTC" },
    { inputHash: "a".repeat(64) }, { asOf: "2025-04-11" }, { replay: { ...report.replay, bars: 99 } }]) {
    await assert.rejects(validateCzscSnapshot({ ...report, ...patch }, data));
  }
  await assert.rejects(validateCzscSnapshot(report, { ...data, bars: data.bars.map((b, i) => i === 2 ? { ...b, close: b.close+1 } : b) }));
  await assert.rejects(validateCzscSnapshot(report, { ...data, stale: true }));
  await assert.rejects(validateCzscSnapshot({ ...report, strokes: [{ start: "2025-01-05", end: "2025-01-10",
    startPrice: 90, endPrice: 100, direction: "UP", observedOn: "2025-01-06" }] }, data));
  await assert.rejects(validateCzscSnapshot({ ...report, zones: [{ start: "2025-01-05", end: "2025-01-10", low: 1, high: 100000, observedOn: "2025-01-12" }] }, data));
});

test("UI keeps CZSC local, fail closed on stale input, and separate from simulated bars", () => {
  const component = readFileSync("components/member/ResearchCandleTerminal.tsx", "utf8");
  assert.match(component, /technicalChartContext\(data.bars\)/);
  assert.match(component, /czsc\?\.key === researchKey/);
  assert.match(component, /file.size > 2_000_000/);
  assert.match(component, /validateCzscSnapshot/);
  assert.doesNotMatch(component, /fetch\(|localStorage|POST|PLACE_ORDER/);
});
