import test from "node:test";
import assert from "node:assert/strict";
import { deriveMemberDailyTechnicalViewFromBars } from "@/lib/forecasts/member-daily-live-levels";

test("bullish daily view derives numeric support/resistance and a downside invalidation", () => {
  const view = deriveMemberDailyTechnicalViewFromBars(
    { symbol: "BTC", direction: "看涨", directionLabel: "上涨" },
    [
      { date: "2026-08-14", open: 63000, high: 64200, low: 62500, close: 63800 },
      { date: "2026-08-15", open: 63800, high: 64900, low: 63200, close: 64600 },
      { date: "2026-08-16", open: 64600, high: 65100, low: 63500, close: 64000 },
      { date: "2026-08-17", open: 64000, high: 64700, low: 63100, close: 64250 },
      { date: "2026-08-18", open: 64250, high: 65500, low: 63900, close: 65000 },
    ]
  );
  assert.ok(view);
  assert.match(view.support, /\d/);
  assert.match(view.resistance, /\d/);
  assert.match(view.invalidation, /^跌破 /);
  assert.doesNotMatch(view.support, /行情数据异常/);
});

test("bearish daily view invalidates only after resistance is reclaimed", () => {
  const view = deriveMemberDailyTechnicalViewFromBars(
    { symbol: "ETH", direction: "看跌", directionLabel: "下跌" },
    [
      { date: "2026-08-16", open: 1800, high: 1860, low: 1760, close: 1820 },
      { date: "2026-08-17", open: 1820, high: 1880, low: 1790, close: 1840 },
      { date: "2026-08-18", open: 1840, high: 1855, low: 1775, close: 1800 },
    ]
  );
  assert.ok(view);
  assert.match(view.invalidation, /^站上 /);
});

test("sideways daily view uses both boundaries and supports SHCOMP alias formatting", () => {
  const view = deriveMemberDailyTechnicalViewFromBars(
    { symbol: "SHCOMP", direction: "中性", directionLabel: "震荡" },
    [
      { date: "2026-08-16", open: 3800, high: 3840, low: 3760, close: 3810 },
      { date: "2026-08-17", open: 3810, high: 3860, low: 3790, close: 3830 },
      { date: "2026-08-18", open: 3830, high: 3850, low: 3785, close: 3820 },
    ]
  );
  assert.ok(view);
  assert.match(view.support, /点/);
  assert.match(view.resistance, /点/);
  assert.match(view.invalidation, /上破 .* \/ 下破 /);
});
