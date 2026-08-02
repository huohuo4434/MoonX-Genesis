import assert from "node:assert/strict";
import test from "node:test";
import { CONVICTION_ASSET_SEED, CONVICTION_ASSETS_MAX } from "../lib/data/conviction/seed.ts";
import {
  VIBE_FOCUS_PERIOD_FORECASTS,
  listVibeFocusPeriodForecasts,
} from "../lib/data/conviction/vibe-focus-forecasts.ts";

test("four Vibe focus assets are published without exceeding the watchlist cap", () => {
  assert.ok(CONVICTION_ASSET_SEED.length <= CONVICTION_ASSETS_MAX);
  const expected = new Map([
    ["googl", "GOOGL"],
    ["msft", "MSFT"],
    ["tencent", "00700"],
    ["kingsoft-office", "688111"],
  ]);
  for (const [id, symbol] of expected) {
    const asset = CONVICTION_ASSET_SEED.find((item) => item.id === id);
    assert.ok(asset, `missing ${id}`);
    assert.equal(asset?.symbol, symbol);
    assert.equal(asset?.isPublished, true);
  }
});

test("each new focus asset has one locked one-month forecast", () => {
  const assetIds = ["googl", "msft", "tencent", "kingsoft-office"] as const;
  for (const assetId of assetIds) {
    const rows = listVibeFocusPeriodForecasts(assetId);
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.forecastType, "MONTH_1");
    assert.equal(rows[0]?.periodStart, "2026-08-03");
    assert.equal(rows[0]?.periodEnd, "2026-09-03");
    assert.equal(rows[0]?.status, "published");
    assert.ok(rows[0]?.lockedAt);
    assert.ok(rows[0]?.benchmarkEvidence);
    assert.equal(rows[0]?.methodViews?.reduce((sum, item) => sum + item.weight, 0), 100);
  }
  assert.equal(VIBE_FOCUS_PERIOD_FORECASTS.length, 4);
});

test("published directions preserve the supplied Liu Yao conclusions", () => {
  const directions = Object.fromEntries(
    VIBE_FOCUS_PERIOD_FORECASTS.map((row) => [row.assetId, row.direction])
  );
  assert.equal(directions.googl, "先跌后涨");
  assert.equal(directions.msft, "冲高回落");
  assert.equal(directions.tencent, "震荡下跌");
  assert.equal(directions["kingsoft-office"], "冲高回落");
});
