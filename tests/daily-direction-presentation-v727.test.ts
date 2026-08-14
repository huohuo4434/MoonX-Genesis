import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  dailyDirectionHeadline,
  dailyPathLabelEn,
  dailyPathLabelZh,
} from "../lib/forecasts/daily-direction-presentation";

test("daily display keeps one overall direction and a separate intraday path", () => {
  assert.equal(dailyDirectionHeadline("先跌后涨", "zh"), "看涨 · 先跌后涨");
  assert.equal(dailyDirectionHeadline("冲高回落", "zh"), "看跌 · 冲高回落");
  assert.equal(dailyDirectionHeadline("震荡上涨", "zh"), "看涨 · 震荡上涨");
  assert.equal(dailyDirectionHeadline("震荡下跌", "zh"), "看跌 · 震荡下跌");
  assert.equal(dailyDirectionHeadline("震荡", "zh"), "方向不明确 · 区间震荡");
});

test("plain up/down become explicit mostly one-way paths without changing direction", () => {
  assert.equal(dailyPathLabelZh("上涨"), "单边上涨");
  assert.equal(dailyPathLabelZh("下跌"), "单边下跌");
  assert.equal(dailyPathLabelEn("上涨"), "Mostly one-way rise");
  assert.equal(dailyPathLabelEn("下跌"), "Mostly one-way decline");
  assert.equal(dailyDirectionHeadline("上涨", "en"), "Bullish · Mostly one-way rise");
});

test("today and tomorrow cards render the richer headline above the detailed path", () => {
  const today = fs.readFileSync(path.join(process.cwd(), "components/home/TodayDailyForecastView.tsx"), "utf8");
  const tomorrow = fs.readFileSync(path.join(process.cwd(), "components/home/TomorrowForecastViews.tsx"), "utf8");
  for (const source of [today, tomorrow]) {
    assert.match(source, /dailyDirectionHeadline/);
    assert.match(source, /dailyPathLabelZh/);
    assert.match(source, /dailyPathLabelEn/);
  }
  assert.match(today, /总体：/);
  assert.match(tomorrow, /总体方向：/);
});
