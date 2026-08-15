import assert from "node:assert/strict";
import test from "node:test";
import { ASTEROID_PERIOD_FORECASTS, type ConvictionPeriodForecast } from "../lib/data/conviction/asteroid-forecasts";
import { buildFocusDailyPublicationBatch, focusDailyChanCapability } from "../lib/data/conviction/focus-daily-generation-core";
import { buildFocusClosedMarketAuxiliaryEvidence } from "../lib/data/conviction/focus-daily-evidence-core";
import { buildFocusDetailedReport } from "../lib/data/conviction/focus-dossier-core";
import { STATIC_FOCUS_ASSET_IDS } from "../lib/data/conviction/focus-registry-core";
import { listStaticFocusForecasts } from "../lib/data/conviction/focus-static-forecast-registry";
import { buildFocusDailyCoverageReport } from "../lib/data/conviction/focus-week-preparation-core";
import { CONVICTION_ASSET_SEED } from "../lib/data/conviction/seed";

const NOW = Date.parse("2026-08-15T02:00:00.000Z");
const sourceWeek = ASTEROID_PERIOD_FORECASTS.find((row) => row.id === "ASTEROID-W3-20260817-V1")!;
const week: ConvictionPeriodForecast = {
  ...sourceWeek,
  id: "FOCUS-DETAILED-WEEK-V1",
  periodStart: "2026-08-10",
  periodEnd: "2026-08-16",
  publishedAt: "2026-08-09T00:00:00.000Z",
  lockedAt: "2026-08-09T00:01:00.000Z",
  dailyPath: undefined,
  keyDates: [
    { date: "2026-08-15", type: "转折", label: "正式奇门时机观察", source: "QIMEN" },
    { date: null, branchRule: "亥日", type: "波动放大", label: "只有地支分支，不推算公历日", source: "QIMEN" },
  ],
};
const auxiliary = {
  evidenceKey: "closed-bars-and-chan-v1",
  supportLevels: ["100"], resistanceLevels: ["120"],
  technicalEvidence: "closed bars through prior session", newsEvidence: "macro summary",
  marketDataStatus: "AVAILABLE" as const, chanStatus: "AVAILABLE" as const,
  chanTimeframes: ["1D"] as const, chanStage: "1D:WAIT_SECOND_BUY_CONFIRMATION",
};

test("all production focus registry assets receive one complete and explicitly classified coverage row", () => {
  assert.equal(STATIC_FOCUS_ASSET_IDS.length, 16);
  const evidence = STATIC_FOCUS_ASSET_IDS.map((assetId) => {
    const asset = CONVICTION_ASSET_SEED.find((row) => row.id === assetId || row.slug === assetId);
    assert.ok(asset, `production metadata missing for ${assetId}`);
    return { assetId, symbol: asset.symbol, assetType: asset.assetType, exchange: asset.exchange, forecasts: listStaticFocusForecasts(assetId) };
  });
  const rows = buildFocusDailyCoverageReport(evidence, "2026-08-15", NOW);
  assert.deepEqual(rows.map((row) => row.assetId).sort(), [...STATIC_FOCUS_ASSET_IDS].sort());
  assert.ok(rows.every((row) => row.quoteMapping && row.rollingCapability && row.chanMapping && row.chanStage && Array.isArray(row.backgroundHorizons) && Array.isArray(row.formalPeriodInventory) && Array.isArray(row.gapReasons)));
  assert.equal(rows.find((row) => row.assetId === "btc")?.chanMapping, "AVAILABLE");
  assert.deepEqual(rows.find((row) => row.assetId === "btc")?.chanTimeframes, ["1D"]);
  assert.equal(rows.find((row) => row.assetId === "asteroid")?.quoteMapping, "UNAVAILABLE");
  assert.equal(rows.find((row) => row.assetId === "asteroid")?.chanMapping, "UNAVAILABLE");
});

test("only an exact dated key-day becomes evidence and auxiliaries cannot replace weekly authority", () => {
  const generated = buildFocusDailyPublicationBatch({ assetId: "btc", weekly: week, asOfDate: "2026-08-15", nowMs: NOW, auxiliary: { ...auxiliary, chanStage: "1D:THIRD_SELL_CONFIRMED" }, latest: [], mode: "CURRENT" });
  const today = generated.all.find((row) => row.forecastDate === "2026-08-15")!;
  const tomorrow = generated.all.find((row) => row.forecastDate === "2026-08-16")!;
  assert.match(today.calendarEvidence?.note ?? "", /正式奇门时机观察/);
  assert.match(today.qimenEvidence ?? "", /QIMEN/);
  assert.equal(tomorrow.calendarEvidence, null, "branch-only evidence must not invent a calendar date");
  const dossier = buildFocusDetailedReport({ assetId: "btc", forecasts: [week], asOfDate: "2026-08-15", nowMs: NOW, generatedDailies: generated.all });
  assert.equal(dossier.reportSchemaVersion, "2026-08-15.v1");
  assert.equal(dossier.weeklyAuthority?.direction, week.direction);
  assert.equal(dossier.dailyPath.find((day) => day.date === "2026-08-15")?.keyDayEvidence?.[0]?.type, "QIMEN");
  assert.equal(dossier.dailyPath.find((day) => day.date === "2026-08-15")?.auxiliaryEvidence?.chanStage, "1D:THIRD_SELL_CONFIRMED");
  assert.equal(dossier.executionAuthority, "RESEARCH_ONLY");
  assert.equal(dossier.tradingEligible, false);
});

test("without a current formal locked week the detailed report remains missing while longer horizons stay background only", () => {
  const month: ConvictionPeriodForecast = { ...week, id: "MONTH-V1", forecastType: "MONTH_1", periodStart: "2026-08-01", periodEnd: "2026-08-31", summary: "月度背景", dailyPath: undefined, keyDates: undefined };
  const dossier = buildFocusDetailedReport({ assetId: "ganfeng-lithium", forecasts: [month], asOfDate: "2026-08-15", nowMs: NOW });
  assert.equal(dossier.weeklyAuthority, null);
  assert.equal(dossier.weeklyEvidenceStatus, "MISSING");
  assert.equal(dossier.dailyPath.length, 0);
  assert.equal(dossier.backgroundHorizons[0]?.forecastType, "MONTH_1");
  assert.equal(dossier.executionAuthority, "RESEARCH_ONLY");
  assert.equal(dossier.tradingEligible, false);
});

test("Chan capability is canonical and unknown instruments fail closed", () => {
  assert.deepEqual(focusDailyChanCapability("SNDK").analyzedTimeframes, ["1D"]);
  assert.equal(focusDailyChanCapability("SNDK").catalogSupported, true);
  assert.equal(focusDailyChanCapability("NBIS").catalogSupported, false);
  assert.equal(focusDailyChanCapability("ASTEROID").reason, "CHAN_INSTRUMENT_UNAVAILABLE");
});

test("production-shared closed-bar evidence excludes current and future bars and reports real Chan availability", () => {
  const bars = Array.from({ length: 24 }, (_, index) => {
    const date = new Date(Date.parse("2026-07-22T00:00:00Z") + index * 86_400_000).toISOString().slice(0, 10);
    const base = 100 + (index % 4 < 2 ? index : index - 3);
    return { date, open: base, high: base + 3, low: base - 3, close: base + (index % 2 ? -1 : 1) };
  });
  bars.push({ date: "2026-08-15", open: 500, high: 510, low: 490, close: 505 });
  const result = buildFocusClosedMarketAuxiliaryEvidence({ symbol: "BTC", quoteSymbol: "BTC-USD", asOfDate: "2026-08-15", bars, xMentions24h: 3 });
  assert.equal(result.marketDataStatus, "AVAILABLE");
  assert.equal(result.chanStatus, "AVAILABLE");
  assert.match(result.chanStage ?? "", /^1D:/);
  assert.doesNotMatch(result.evidenceKey, /2026-08-15/);
  assert.doesNotMatch(result.supportLevels.join(" ") + result.resistanceLevels.join(" "), /490|510/);
});
