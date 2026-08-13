import test from "node:test";
import assert from "node:assert/strict";

import { CONVICTION_ASSET_SEED, CONVICTION_ASSETS_MAX } from "../lib/data/conviction/seed";
import { WATCHLIST_TEASERS } from "../lib/data/conviction/watchlist-teasers";
import {
  NBIS_PERIOD_FORECASTS,
  NBIS_PERIOD_ORDER,
  listNbisPeriodForecasts,
} from "../lib/data/conviction/nbis-liuyao-20260811";
import { getAssetPresentation } from "../lib/presentation/asset-catalog";

test("SNDK and NBIS are both registered as published focus assets", () => {
  assert.ok(CONVICTION_ASSET_SEED.length <= CONVICTION_ASSETS_MAX);
  for (const id of ["sandisk", "nbis"]) {
    const asset = CONVICTION_ASSET_SEED.find((item) => item.id === id);
    const teaser = WATCHLIST_TEASERS.find((item) => item.slug === id);
    assert.ok(asset?.isPublished && asset.status === "published", `${id} asset registration`);
    assert.ok(teaser, `${id} public teaser registration`);
  }
  assert.equal(getAssetPresentation("NBIS")?.assetId, "nbis");
  assert.equal(getAssetPresentation("SNDK")?.assetId, "sandisk");
});

test("all locked NBIS member periods remain published, immutable and two-teacher reviewed", () => {
  const published = listNbisPeriodForecasts();
  assert.equal(published.length, 6);
  assert.deepEqual(published.map((item) => item.forecastType), NBIS_PERIOD_ORDER);
  assert.deepEqual(published.map((item) => item.id), [
    "NBIS-W1-20260811-V1",
    "NBIS-W2-20260817-V1",
    "NBIS-W3-20260824-V1",
    "NBIS-AUG-20260811-V1",
    "NBIS-SEP-20260901-V1",
    "NBIS-3M-20260811-V1",
  ]);
  for (const item of published) {
    assert.equal(item.status, "published");
    assert.equal(item.sourceType, "ICHING_RESEARCH");
    assert.equal(item.lockedAt, item.publishedAt);
    assert.equal(item.methodViews?.length, 2);
    assert.equal(item.methodViews?.reduce((sum, view) => sum + view.weight, 0), 100);
    assert.ok(item.ichingEvidence.primaryHexagram);
    assert.ok(item.ichingEvidence.changingHexagram);
  }
  assert.equal(NBIS_PERIOD_FORECASTS[4]?.forecastType, "MONTH_3");
  assert.equal(NBIS_PERIOD_FORECASTS[5]?.forecastType, "YEAR_1");
});

test("published member research cannot silently disappear from the focus registry", () => {
  const assetIds = new Set(CONVICTION_ASSET_SEED.filter((item) => item.isPublished).map((item) => item.id));
  const teaserSlugs = new Set(WATCHLIST_TEASERS.map((item) => item.slug));
  const publishedResearchIds = new Set([
    ...listNbisPeriodForecasts().map((item) => item.assetId),
    "sandisk",
  ]);
  for (const assetId of publishedResearchIds) {
    assert.ok(assetIds.has(assetId), `${assetId} must have a published asset card`);
    assert.ok(teaserSlugs.has(assetId), `${assetId} must have a focus teaser`);
  }
});
