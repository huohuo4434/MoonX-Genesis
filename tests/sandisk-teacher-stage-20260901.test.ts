import assert from "node:assert/strict";
import test from "node:test";
import {
  SANDISK_TEACHER_STAGE_REVISIONS_20260901,
  SANDISK_TEACHER_STAGE_SOURCE_20260901,
} from "../lib/data/conviction/sandisk-forecasts";
import { listLatestStaticFocusForecastsByType, listStaticFocusForecasts } from "../lib/data/conviction/focus-static-forecast-registry";

test("July 7 teacher source is hash-traceable and not backdated as a site revision", () => {
  assert.equal(SANDISK_TEACHER_STAGE_SOURCE_20260901.sourcePublishedDate, "2026-07-07");
  assert.equal(SANDISK_TEACHER_STAGE_SOURCE_20260901.transcriptSha256, "50894116A93B5D0F7A7A53CD3A300DE932C9576816954FF46C2E7381445B2338");
  assert.equal(SANDISK_TEACHER_STAGE_SOURCE_20260901.frameSha256, "8A6F1BF152221AAA9DB0C77BB3CDFE3E96CB8F0E5B503B0A42D4E2D4AB7EA9EF");
  assert.ok(SANDISK_TEACHER_STAGE_REVISIONS_20260901.every((row) => row.publishedAt === "2026-09-01T20:33:02+08:00"));
});

test("SNDK V4 preserves old rows while making September 7 the explicit bullish turn", () => {
  const full = listStaticFocusForecasts("sandisk");
  const latest = listLatestStaticFocusForecastsByType("sandisk");
  assert.ok(full.some((row) => row.id === "SNDK-M1-20260901-V3"));
  assert.ok(full.some((row) => row.id === "SNDK-W6-20260907-V1"));
  assert.equal(latest.find((row) => row.forecastType === "MONTH_1")?.id, "SNDK-M1-20260901-V4");
  assert.equal(latest.find((row) => row.forecastType === "MONTH_1")?.direction, "先跌后涨");
  assert.equal(latest.find((row) => row.forecastType === "WEEK_6")?.id, "SNDK-W6-20260907-V2");
  assert.equal(latest.find((row) => row.forecastType === "WEEK_6")?.direction, "先跌后涨");
  assert.equal(latest.find((row) => row.forecastType === "WEEK_9")?.direction, "震荡上涨");
  assert.equal(latest.find((row) => row.forecastType === "MONTH_1")?.keyDates?.[0]?.date, "2026-09-07");
});
