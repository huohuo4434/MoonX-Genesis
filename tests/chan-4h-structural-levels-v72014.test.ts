import test from "node:test";
import assert from "node:assert/strict";
import { deriveChanStructuralLevels } from "@/lib/market-data/chan-structural-levels-core";
import type { ChanCandle } from "@/types/chan-execution";

const FOUR_HOURS = 14_400_000;

function candlesFromCloses(closes: number[], range = 420): ChanCandle[] {
  return closes.map((close, index) => {
    const open = index ? closes[index - 1]! : close - 80;
    return {
      timestamp: Date.UTC(2026, 7, 1) + index * FOUR_HOURS,
      open,
      high: Math.max(open, close) + range,
      low: Math.min(open, close) - range,
      close,
      volume: 1_000 + index,
    };
  });
}

test("4H headline map uses confirmed structure instead of the nearest tiny wick", () => {
  const levels = deriveChanStructuralLevels({
    timeframe: "4H",
    candles: candlesFromCloses([
      75_000, 77_800, 74_600, 79_200, 74_200, 80_100,
      75_100, 79_500, 75_500, 79_000, 75_900, 78_600,
      76_100, 78_300, 76_300, 78_100, 76_450, 77_950,
      76_550, 77_850, 76_650, 77_750, 76_720, 77_620,
      76_760, 77_500, 76_800, 77_350, 76_850, 77_000,
    ]),
  });

  assert.ok(levels);
  assert.equal(levels.primaryTimeframe, "4H");
  assert.match(levels.source, /4H$/);
  assert.ok(levels.supportValue < levels.currentPrice);
  assert.ok(levels.resistanceValue > levels.currentPrice);
  assert.ok(
    levels.resistanceValue - levels.supportValue >= levels.currentPrice * 0.008,
    `headline map is still tactical-sized: ${levels.supportValue}..${levels.resistanceValue}`
  );
  assert.doesNotMatch(levels.sourceLabel, /1H/u);
});

test("1H remains an explicit tactical fallback rather than pretending to be 4H", () => {
  const levels = deriveChanStructuralLevels({
    timeframe: "1H",
    candles: candlesFromCloses([
      100, 103, 99, 104, 98, 105, 99, 104, 100, 103,
      100, 102, 100.5, 102.5, 101, 102.8, 101.2, 103,
    ], 0.35),
  });

  assert.ok(levels);
  assert.equal(levels.primaryTimeframe, "1H");
  assert.match(levels.source, /1H$/);
  assert.match(levels.sourceLabel, /降级/u);
});

test("24-hour move uses elapsed time instead of assuming six equity bars per session", () => {
  const start = Date.UTC(2026, 7, 17, 13, 30);
  const candles = Array.from({ length: 14 }, (_, index) => {
    const session = Math.floor(index / 2);
    const timestamp = start + session * 24 * 60 * 60 * 1_000 + (index % 2) * FOUR_HOURS;
    const close = 100 + session + (index % 2 ? 0.2 : 0);
    return { timestamp, open: close - 0.1, high: close + 0.4, low: close - 0.4, close, volume: 1 };
  });
  const levels = deriveChanStructuralLevels({ timeframe: "4H", candles });
  assert.ok(levels);
  const expected = ((106.2 - 105.2) / 105.2) * 100;
  assert.ok(Math.abs((levels.move24hPct ?? 0) - expected) < 0.001);
});
