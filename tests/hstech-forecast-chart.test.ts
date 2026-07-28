import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  HSTECH_YAHOO_SYMBOL,
  quoteSanityFailure,
  resolveCanonicalQuoteSymbol,
} from "../lib/market-data/quote-symbols";
import { assertScenarioProbabilities, selectForecastInterval } from "../lib/research/long-term-forecast-chart";
import { buildWtiExtForecastChartV1 } from "../lib/data/wti-forecast-chart-draft";

describe("HSTECH quote mapping", () => {
  test("maps ETF and caret aliases to Hang Seng TECH index", () => {
    assert.equal(resolveCanonicalQuoteSymbol("HSTECH", "3033.HK"), HSTECH_YAHOO_SYMBOL);
    assert.equal(resolveCanonicalQuoteSymbol("HSTECH", "^HSTECH"), HSTECH_YAHOO_SYMBOL);
    assert.equal(resolveCanonicalQuoteSymbol("HSTECH", "HSTECH"), HSTECH_YAHOO_SYMBOL);
  });

  test("rejects ETF-scale closes", () => {
    const err = quoteSanityFailure({
      symbol: "HSTECH",
      quoteSymbol: "HSTECH.HK",
      close: 4.644,
      previousClose: 4.6,
      high: 4.7,
      low: 4.5,
    });
    assert.equal(err, "疑似标的或价格缩放错误");
  });

  test("accepts index-scale closes", () => {
    const err = quoteSanityFailure({
      symbol: "HSTECH",
      quoteSymbol: "HSTECH.HK",
      close: 4730.61,
      previousClose: 4700,
      high: 4780,
      low: 4680,
    });
    assert.equal(err, null);
  });
});

describe("long-term forecast chart", () => {
  test("WTI mid-horizon uses monthly interval", () => {
    assert.equal(selectForecastInterval("2026-08-07", "2027-02-04"), "month");
  });

  test("WTI draft chart probabilities sum to 100 and is locked", () => {
    const chart = buildWtiExtForecastChartV1();
    assert.equal(chart.enabled, true);
    assert.equal(chart.locked, true);
    assert.equal(chart.version, 1);
    assert.equal(chart.interval, "month");
    assert.ok(assertScenarioProbabilities(chart));
    assert.ok(chart.actualCandles.length >= 20);
    assert.ok(chart.baseScenario.candles.every((c) => c.isForecast === true));
    assert.ok(chart.baseScenario.candles.some((c) => c.pendingReview));
    assert.ok(chart.baseScenario.candles.some((c) => !c.pendingReview));
  });
});
