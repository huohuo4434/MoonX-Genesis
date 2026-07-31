import test from "node:test";
import assert from "node:assert/strict";
import { CONVICTION_ASSET_SEED } from "@/lib/data/conviction/seed";
import {
  listMuHypePeriodForecasts,
  VISIBLE_PERIOD_ORDER_BY_ASSET,
} from "@/lib/data/conviction/mu-hype-forecasts";

test("MU and HYPE are published conviction assets", () => {
  assert.ok(CONVICTION_ASSET_SEED.some((asset) => asset.slug === "mu" && asset.symbol === "MU"));
  assert.ok(CONVICTION_ASSET_SEED.some((asset) => asset.slug === "hype" && asset.symbol === "HYPE"));
});

test("MU/HYPE publish grounded weekly and monthly analyses", () => {
  for (const assetId of ["mu", "hype"] as const) {
    const records = listMuHypePeriodForecasts(assetId);
    assert.ok(records.length >= 5);
    assert.deepEqual(VISIBLE_PERIOD_ORDER_BY_ASSET[assetId], ["WEEK", "MONTH_1"]);
    assert.ok(
      records
        .filter((record) => ["WEEK", "MONTH_1"].includes(record.forecastType))
        .every(
          (record) =>
            record.direction !== "待复核" &&
            record.summary.length > 20 &&
            record.expectedPath.length > 10 &&
            record.ichingEvidence.notes.length > 10
        )
    );
    assert.ok(records.every((record) => record.validationStatus === "UNVERIFIED"));
  }
});
