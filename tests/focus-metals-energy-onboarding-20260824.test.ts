import assert from "node:assert/strict";
import test from "node:test";

import { CONVICTION_ASSET_SEED } from "../lib/data/conviction/seed.ts";
import { focusDailyChanCapability, focusDailyQuoteCapability } from "../lib/data/conviction/focus-daily-generation-core.ts";
import { listMetalsEnergyFocusForecasts } from "../lib/data/conviction/metals-energy-focus-forecasts.ts";
import {
  ACTIVE_STATIC_FOCUS_ASSET_IDS,
  STATIC_MEMBER_AUTOMATION_FOCUS,
} from "../lib/data/conviction/focus-registry-core.ts";
import { WATCHLIST_TEASERS } from "../lib/data/conviction/watchlist-teasers.ts";
import { listAiTradingFocusRegistry } from "../lib/trading-signals/ai-trading-focus.ts";

const EXPECTED_ACTIVE = [
  "cxmt", "asteroid", "sandisk", "nbis", "mu", "nvda", "aapl", "amzn", "hype", "sol", "eth", "btc", "googl",
  "msft", "tencent", "tsla", "lite", "spcx", "intel", "gold", "silver", "wti-crude",
] as const;

test("the production focus registry contains all 22 active assets", () => {
  assert.deepEqual(ACTIVE_STATIC_FOCUS_ASSET_IDS, EXPECTED_ACTIVE);
  const publishedSlugs = new Set(CONVICTION_ASSET_SEED.filter((asset) => asset.isPublished).map((asset) => asset.slug));
  const teaserSlugs = new Set(WATCHLIST_TEASERS.map((teaser) => teaser.slug));
  for (const assetId of EXPECTED_ACTIVE) {
    assert.equal(publishedSlugs.has(assetId), true, `missing seed: ${assetId}`);
    assert.equal(teaserSlugs.has(assetId), true, `missing teaser: ${assetId}`);
  }
  assert.equal(STATIC_MEMBER_AUTOMATION_FOCUS.aapl.canonicalSymbol, null);
  assert.equal(STATIC_MEMBER_AUTOMATION_FOCUS.amzn.canonicalSymbol, null);
});

test("gold, silver and WTI expose locked current, forward and monthly research", () => {
  for (const assetId of ["gold", "silver", "wti-crude"] as const) {
    const forecasts = listMetalsEnergyFocusForecasts(assetId);
    assert.deepEqual(forecasts.map((row) => row.forecastType), ["WEEK", "WEEK_2", "WEEK_3", "WEEK_4", "WEEK_5", "WEEK_6", "MONTH_1"]);
    assert.equal(forecasts.every((row) => row.status === "published" && row.sourceType === "ICHING_RESEARCH"), true);
    assert.equal(forecasts.every((row) => row.supportLevels.length === 0 && row.resistanceLevels.length === 0), true, "must not invent price levels");
  }
  const goldCurrent = listMetalsEnergyFocusForecasts("gold")[0];
  assert.equal(goldCurrent.consensusStars, null, "timing-only Qimen must not become a full-week consensus score");
  assert.match(goldCurrent.consensusLabel ?? "", /只确认前段时机/);
});

test("commodity quote, Chan and exact automation mappings are available", () => {
  assert.deepEqual(focusDailyQuoteCapability({ symbol: "GOLD", assetType: "COMMODITY", exchange: "COMEX" }), { available: true, market: "US", quoteSymbol: "GC=F", reason: null });
  assert.deepEqual(focusDailyQuoteCapability({ symbol: "SILVER", assetType: "COMMODITY", exchange: "COMEX" }), { available: true, market: "US", quoteSymbol: "SI=F", reason: null });
  assert.deepEqual(focusDailyQuoteCapability({ symbol: "WTI", assetType: "COMMODITY", exchange: "NYMEX" }), { available: true, market: "US", quoteSymbol: "CL=F", reason: null });
  assert.equal(focusDailyChanCapability("GOLD").instrument, "GOLD");
  assert.equal(focusDailyChanCapability("SILVER").instrument, "SILVER");
  assert.equal(focusDailyChanCapability("WTI").instrument, "WTI");
  assert.equal(STATIC_MEMBER_AUTOMATION_FOCUS.gold.canonicalSymbol, "XAUTUSDT");
  assert.equal(STATIC_MEMBER_AUTOMATION_FOCUS.silver.canonicalSymbol, "XAGUSDT");
  assert.equal(STATIC_MEMBER_AUTOMATION_FOCUS["wti-crude"].canonicalSymbol, "CLUSDT");
  const registry = listAiTradingFocusRegistry();
  for (const symbol of ["XAUTUSDT", "XAGUSDT", "CLUSDT"]) {
    assert.equal(registry.filter((row) => row.canonicalSymbol === symbol).length, 1, `duplicate automation symbol: ${symbol}`);
  }
});
