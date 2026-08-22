import assert from "node:assert/strict";
import test from "node:test";

import { isTradingDay } from "../lib/calendar/next-trading-day";
import { buildFocusDailyPublicationBatch } from "../lib/data/conviction/focus-daily-generation-core";
import { buildFocusDetailedReport } from "../lib/data/conviction/focus-dossier-core";
import { focusSessionMarket, isFocusTradingDay } from "../lib/data/conviction/focus-market-session";
import { buildFocusQimenParallelReading } from "../lib/forecasts/focus-qimen-parallel";
import { INTEL_PERIOD_FORECASTS } from "../lib/data/conviction/intel-liuyao-20260822";

const NOW = Date.parse("2026-08-22T12:00:00+08:00");

test("focus market calendar keeps crypto 7x24 and closes each equity exchange on weekends", () => {
  assert.equal(focusSessionMarket("intel"), "us");
  assert.equal(focusSessionMarket("tencent"), "hk");
  assert.equal(focusSessionMarket("cxmt"), "cn");
  assert.equal(focusSessionMarket("btc"), "crypto");
  assert.equal(isFocusTradingDay("intel", "2026-08-22"), false);
  assert.equal(isFocusTradingDay("intel", "2026-08-24"), true);
  assert.equal(isFocusTradingDay("btc", "2026-08-22"), true);
  assert.equal(isTradingDay("commodity", "2026-08-22"), false);
});

test("closed equity dates stay visible as observation rows but have no formal direction or validation sample", () => {
  const dossier = buildFocusDetailedReport({ assetId: "intel", forecasts: INTEL_PERIOD_FORECASTS, asOfDate: "2026-08-22", nowMs: NOW });
  const saturday = dossier.dailyPath.find((day) => day.date === "2026-08-22");
  const sunday = dossier.dailyPath.find((day) => day.date === "2026-08-23");
  const monday = dossier.dailyPath.find((day) => day.date === "2026-08-24");
  assert.equal(saturday?.direction, null);
  assert.equal(sunday?.direction, null);
  assert.match(saturday?.summary ?? "", /休市观察.*不生成正式日方向.*不计入/);
  assert.ok(monday?.direction);
  assert.ok(dossier.pendingVerification.every((row) => !/2026-08-2[23]/.test(row)));
  assert.equal(dossier.qimenParallel.dailyRows[0]?.qimen.direction, "休市观察");
  assert.equal(dossier.qimenParallel.dailyRows[0]?.qimen.verificationEligible, false);
  assert.equal(dossier.qimenParallel.dailyRows[0]?.liuyaoDirection, null);
});

test("publisher never creates an equity weekend record, including when a source path contains one", () => {
  const authority = INTEL_PERIOD_FORECASTS[0]!;
  const batch = buildFocusDailyPublicationBatch({
    assetId: "intel",
    weekly: authority,
    asOfDate: "2026-08-22",
    nowMs: NOW,
    auxiliary: { evidenceKey: "closed", supportLevels: [], resistanceLevels: [], technicalEvidence: null, newsEvidence: null },
    latest: [],
    mode: "CURRENT",
  });
  assert.deepEqual(batch.all.map((row) => row.forecastDate), ["2026-08-24", "2026-08-25", "2026-08-26", "2026-08-27", "2026-08-28"]);
  assert.ok(batch.all.every((row) => row.direction.length > 0));
});

test("Qimen also fails closed on a weekday exchange holiday, not only Saturday and Sunday", () => {
  const holiday = buildFocusQimenParallelReading({ assetId: "sandisk", forecastDate: "2026-09-07", liuyaoDirection: "上涨" });
  assert.equal(holiday.direction, "休市观察");
  assert.equal(holiday.relation, "NOT_COMPARABLE");
  assert.equal(holiday.validationStatus, "NOT_ELIGIBLE");
  assert.equal(holiday.verificationEligible, false);
});
