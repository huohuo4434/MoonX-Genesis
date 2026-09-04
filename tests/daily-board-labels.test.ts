import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { dailyBoardDateLabel, dailyTechnicalBasisLabel } from "../lib/presentation/daily-board-labels";

test("next-session summary preserves different market calendars without changing input", () => {
  const rows = Object.freeze([
    Object.freeze({ forecastForDate: "2026-09-08" }),
    Object.freeze({ forecastForDate: "2026-09-05" }),
    Object.freeze({ forecastForDate: "2026-09-08" }),
  ]);
  assert.equal(dailyBoardDateLabel(rows), "2026年9月5日 / 2026年9月8日 · 各市场交易日不同");
  assert.equal(rows[0].forecastForDate, "2026-09-08");
  assert.equal(dailyBoardDateLabel([{ forecastForDate: "2026-09-04" }]), "2026年9月4日");
  assert.equal(dailyBoardDateLabel([]), "日期待核对");
  assert.equal(dailyBoardDateLabel([{}]), "日期待核对");
});

test("ETF references cannot masquerade as index points", () => {
  for (const source of ["CHAN_4H", "SWING_4H", "CHAN_1H", "SWING_1H", "FALLBACK"]) {
    assert.equal(dailyTechnicalBasisLabel(source, "QQQ"), "技术位置采用 QQQ ETF（美元/份），不是纳指100指数点数");
    assert.match(dailyTechnicalBasisLabel(source, "SPY"), /不是标普500指数点数/);
  }
  assert.equal(dailyTechnicalBasisLabel("CHAN_4H", "BTCUSDT"), "技术参考行情：BTCUSDT");
  assert.match(dailyTechnicalBasisLabel("CHAN_4H"), /待核对/);
});

test("historical fallback and missing data cannot be labelled live ETF data", () => {
  for (const source of ["VERIFIED_OHLC", "FORECAST_SNAPSHOT", "LOCKED_LEVELS"]) {
    assert.match(dailyTechnicalBasisLabel(source, "QQQ"), /不是实时行情/);
    assert.doesNotMatch(dailyTechnicalBasisLabel(source, "QQQ"), /采用 QQQ/);
  }
  assert.equal(dailyTechnicalBasisLabel("UNAVAILABLE", "QQQ"), "技术位置暂不可用");
});

test("member page wires dates, actual provider identity and mid-term reading links", () => {
  const page = readFileSync("app/member/daily/page.tsx", "utf8");
  const adapter = readFileSync("lib/forecasts/member-daily-live-levels.ts", "utf8");
  assert.match(page, /dailyBoardDateLabel\(rows\)/);
  assert.match(page, /dailyBoardDateLabel\(tomorrowRows\)/);
  assert.doesNotMatch(page, /tomorrowRows\[0\]|rows\[0\]/);
  assert.match(page, /dailyTechnicalBasisLabel\(technical.source, technical.quoteSymbol\)/);
  assert.match(adapter, /quoteSymbol: resolveIntradayTechnicalTarget\(normalizeSymbol\(forecast.symbol\)\)\?\.providerSymbol/);
  assert.match(page, /不是技术行情时间/);
  assert.match(page, /做中线：先看周走势/);
  assert.match(page, /href="\/member\/key-dates"/);
});
