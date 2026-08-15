import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { ConvictionPeriodForecast } from "../lib/data/conviction/asteroid-forecasts";
import { buildFocusDossier, focusDossierPeriodDates, loadFocusDossierGeneratedDailies } from "../lib/data/conviction/focus-dossier-core";
import type { GeneratedDailyForecastRecord } from "../lib/weekly-source/types";
import { listFocusResearchSupplements } from "../lib/data/conviction/focus-research-supplements";

const NOW = Date.parse("2026-08-15T10:00:00+08:00");

function forecast(overrides: Partial<ConvictionPeriodForecast>): ConvictionPeriodForecast {
  return {
    id: "formal-v1",
    assetId: "asset",
    forecastType: "WEEK",
    periodStart: "2026-08-10",
    periodEnd: "2026-08-16",
    direction: "震荡",
    upProbability: 34,
    sidewaysProbability: 33,
    downProbability: 33,
    summary: "正式结论",
    expectedPath: "正式路径",
    supportLevels: [],
    resistanceLevels: [],
    riskLevel: "高",
    catalysts: [],
    risks: [],
    version: 1,
    status: "published",
    sourceType: "ICHING_RESEARCH",
    publishedAt: "2026-08-09T10:00:00+08:00",
    lockedAt: "2026-08-09T10:00:00+08:00",
    validationStatus: "UNVERIFIED",
    ...overrides,
  };
}

function dailyPath(startDay: number, count: number) {
  return Array.from({ length: count }, (_, index) => ({
    date: `2026-08-${String(startDay + index).padStart(2, "0")}`,
    status: "预测",
    direction: "观察",
    consensusStars: 3,
    summary: `第 ${index + 1} 日正式证据`,
  }));
}

function generatedDay(forecastDate: string, sourceWeeklyForecastId: string): GeneratedDailyForecastRecord {
  return {
    id: `generated-${forecastDate}`,
    marketCode: "FOCUS:ASSET",
    forecastDate,
    sourceWeeklyForecastId,
    direction: "NEUTRAL",
    upProbability: 33,
    sidewaysProbability: 34,
    downProbability: 33,
    expectedPath: `${forecastDate} 下周逐日研究`,
    supportLevels: [],
    resistanceLevels: [],
    confirmationLevel: null,
    invalidationLevel: null,
    riskLevel: null,
    catalysts: [],
    risks: [],
    liuyaoEvidence: "FOCUS_SOURCE_KIND=MOOX_WEEK_DERIVED; AS_OF=2026-08-15",
    qimenEvidence: null,
    calendarEvidence: null,
    technicalEvidence: null,
    newsEvidence: null,
    marketProgressStatus: "NOT_STARTED",
    revisionReason: null,
    previousVersionId: null,
    version: 1,
    status: "PUBLISHED",
    generatedAt: "2026-08-15T09:00:00+08:00",
    publishedAt: "2026-08-15T09:00:00+08:00",
    lockedAt: null,
    validatedAt: null,
    validationStatus: null,
  };
}

test("a formal period longer than seven days is ready when every calendar date is covered", () => {
  const eightDays = forecast({ periodStart: "2026-08-09", periodEnd: "2026-08-16", dailyPath: dailyPath(9, 8) });
  const dossier = buildFocusDossier({ assetId: "asset", forecasts: [eightDays], asOfDate: "2026-08-15", nowMs: NOW });
  assert.equal(dossier.dailyPath.length, 8);
  assert.equal(dossier.evidenceStatus, "READY");
  assert.equal(dossier.dailyEvidenceStatus, "READY");
});

test("production-shared persisted-daily reader loads all eight dates and the eighth generated row completes the dossier", async () => {
  const partial = forecast({
    id: "eight-day-week",
    periodStart: "2026-08-09",
    periodEnd: "2026-08-16",
    dailyPath: dailyPath(9, 7),
  });
  const base = buildFocusDossier({ assetId: "asset", forecasts: [partial], asOfDate: "2026-08-15", nowMs: NOW });
  assert.equal(base.evidenceStatus, "INCOMPLETE");
  let readerCalls = 0;
  const generated = await loadFocusDossierGeneratedDailies({
    dossier: base,
    marketCode: "FOCUS:ASSET",
    read: async (marketCode, dates) => {
      readerCalls += 1;
      assert.equal(marketCode, "FOCUS:ASSET");
      assert.deepEqual(dates, ["2026-08-09", "2026-08-10", "2026-08-11", "2026-08-12", "2026-08-13", "2026-08-14", "2026-08-15", "2026-08-16"]);
      return [{
        id: "generated-day-8",
        marketCode,
        forecastDate: "2026-08-16",
        sourceWeeklyForecastId: partial.id,
        direction: "NEUTRAL",
        upProbability: 33,
        sidewaysProbability: 34,
        downProbability: 33,
        expectedPath: "第八日权威追加研究",
        supportLevels: [],
        resistanceLevels: [],
        confirmationLevel: null,
        invalidationLevel: null,
        riskLevel: null,
        catalysts: [],
        risks: [],
        liuyaoEvidence: null,
        qimenEvidence: null,
        calendarEvidence: null,
        technicalEvidence: null,
        newsEvidence: null,
        marketProgressStatus: "NOT_STARTED",
        revisionReason: null,
        previousVersionId: null,
        version: 1,
        status: "PUBLISHED",
        generatedAt: "2026-08-15T09:00:00+08:00",
        publishedAt: "2026-08-15T09:00:00+08:00",
        lockedAt: null,
        validatedAt: null,
        validationStatus: null,
      } satisfies GeneratedDailyForecastRecord];
    },
  });
  assert.equal(readerCalls, 1);
  const completed = buildFocusDossier({ assetId: "asset", forecasts: [partial], asOfDate: "2026-08-15", nowMs: NOW, generatedDailies: generated });
  assert.equal(completed.dailyPath.length, 8);
  assert.equal(completed.dailyPath.at(-1)?.summary, "第八日权威追加研究");
  assert.equal(completed.evidenceStatus, "READY");
});

test("invalid, reversed and over-62-day dossier periods never start the persisted reader", async () => {
  let readerCalls = 0;
  for (const [periodStart, periodEnd] of [["bad", "2026-08-16"], ["2026-08-16", "2026-08-10"], ["2026-01-01", "2026-08-16"]]) {
    assert.deepEqual(focusDossierPeriodDates(periodStart, periodEnd), []);
    const rows = await loadFocusDossierGeneratedDailies({
      dossier: { periodStart, periodEnd },
      marketCode: "FOCUS:ASSET",
      read: async () => { readerCalls += 1; return []; },
    });
    assert.deepEqual(rows, []);
  }
  assert.equal(readerCalls, 0);
});

test("weekend view highlights a fully prepared future week without presenting it as current", () => {
  const current = forecast({ id: "current-week-v1", summary: "本期正式结论", dailyPath: dailyPath(10, 7) });
  const next = forecast({ id: "next-week-v1", periodStart: "2026-08-17", periodEnd: "2026-08-23", summary: "下周正式结论", dailyPath: dailyPath(17, 7) });
  const dossier = buildFocusDossier({ assetId: "asset", forecasts: [current, next], asOfDate: "2026-08-15", nowMs: NOW });
  assert.equal(dossier.displayScope, "NEXT_PERIOD_READY");
  assert.equal(dossier.conclusion, "本期正式结论", "current immutable period remains separately available");
  assert.equal(dossier.periodStart, "2026-08-10");
  assert.equal(dossier.weeklyEvidenceStatus, "READY");
  assert.equal(dossier.nextWeek?.dailyEvidenceReady, true);
  assert.equal(dossier.nextWeek?.dailyPath.length, 7);
  assert.equal(dossier.nextWeek?.conclusion, "下周正式结论");
  const panel = readFileSync("components/conviction/FocusDossierPanel.tsx", "utf8");
  assert.match(panel, /下周已准备（未来期）/);
  assert.match(panel, /本期资料仍按原周期保留/);
  assert.match(panel, /下一期逐日路径（未来期）/);
});

test("persisted next-week rows are loaded and overlaid only onto their exact weekly source", async () => {
  const current = forecast({ id: "current-week-v1", summary: "本期正式结论", dailyPath: dailyPath(10, 7) });
  const next = forecast({ id: "next-week-v1", periodStart: "2026-08-17", periodEnd: "2026-08-23", summary: "下周正式结论", dailyPath: undefined });
  const base = buildFocusDossier({ assetId: "asset", forecasts: [current, next], asOfDate: "2026-08-15", nowMs: NOW });
  const persisted = Array.from({ length: 7 }, (_, index) => generatedDay(`2026-08-${17 + index}`, next.id));
  let readerCalls = 0;
  const loaded = await loadFocusDossierGeneratedDailies({
    dossier: base,
    marketCode: "FOCUS:ASSET",
    read: async (_marketCode, dates) => {
      readerCalls += 1;
      assert.deepEqual(dates, [
        "2026-08-10", "2026-08-11", "2026-08-12", "2026-08-13", "2026-08-14", "2026-08-15", "2026-08-16",
        "2026-08-17", "2026-08-18", "2026-08-19", "2026-08-20", "2026-08-21", "2026-08-22", "2026-08-23",
      ]);
      return [...persisted, generatedDay("2026-08-17", "different-week")];
    },
  });
  assert.equal(readerCalls, 1);
  const dossier = buildFocusDossier({ assetId: "asset", forecasts: [current, next], asOfDate: "2026-08-15", nowMs: NOW, generatedDailies: loaded });
  assert.equal(dossier.nextWeek?.dailyEvidenceReady, true);
  assert.equal(dossier.nextWeek?.dailyPath.length, 7);
  assert.equal(dossier.nextWeek?.dailyPath[0]?.summary, "2026-08-17 下周逐日研究");
  assert.equal(dossier.displayScope, "NEXT_PERIOD_READY");
});

test("a formal forecast for the week after next is not labeled or promoted as next week", () => {
  const later = forecast({ id: "later-week-v1", periodStart: "2026-08-24", periodEnd: "2026-08-30", summary: "隔周正式结论", dailyPath: dailyPath(24, 7) });
  const dossier = buildFocusDossier({ assetId: "asset", forecasts: [later], asOfDate: "2026-08-15", nowMs: NOW });
  assert.equal(dossier.nextWeek, null);
  assert.equal(dossier.displayScope, "MISSING");
  assert.doesNotMatch(dossier.statusLabel, /下周已准备/);
});

test("monthly-only focus assets show the monthly conclusion and explicit weekly and daily gaps", () => {
  for (const assetId of ["kingsoft-office", "espressif", "united-imaging", "ganfeng-lithium"]) {
    const monthly = forecast({ id: `${assetId}-month-v1`, assetId, forecastType: "MONTH_1", periodStart: "2026-08-01", periodEnd: "2026-08-31", summary: `${assetId} 月度正式结论`, dailyPath: undefined });
    const dossier = buildFocusDossier({ assetId, forecasts: [monthly], asOfDate: "2026-08-15", nowMs: NOW });
    assert.equal(dossier.displayScope, "MONTH_ONLY");
    assert.equal(dossier.weeklyEvidenceStatus, "MISSING");
    assert.equal(dossier.dailyEvidenceStatus, "MISSING");
    assert.equal(dossier.monthlyEvidence?.conclusion, `${assetId} 月度正式结论`);
    assert.match(dossier.statusLabel, /月度结论已发布；周证据缺失；日证据缺失/);
  }
});

test("MU late source and SNDK source gap remain research-only and cannot become formal or historical hits", () => {
  const mu = listFocusResearchSupplements("mu");
  assert.equal(mu.length, 1);
  assert.deepEqual({ status: mu[0]?.status, authority: mu[0]?.executionAuthority, publishedAt: mu[0]?.sourcePublishedAt, lockedAt: mu[0]?.lockedAt, summary: mu[0]?.summary, historical: mu[0]?.includedInHistoricalHitRate }, {
    status: "LATE_INGESTED_SOURCE", authority: "RESEARCH_ONLY", publishedAt: null, lockedAt: null, summary: null, historical: false,
  });
  assert.match(mu[0]?.gapNote ?? "", /不回填正式周预测，也不计入历史命中/);

  const sndk = listFocusResearchSupplements("sandisk");
  assert.equal(sndk[0]?.status, "SOURCE_GAP");
  assert.equal(sndk[0]?.summary, null);
  assert.match(sndk[0]?.gapNote ?? "", /暂不写入方向结论/);

  const dossier = buildFocusDossier({ assetId: "mu", forecasts: [], asOfDate: "2026-08-15", nowMs: NOW, supplementalEvidence: mu });
  assert.equal(dossier.conclusion, null);
  assert.equal(dossier.publicationStatus, "MISSING");
  assert.equal(dossier.supplementalEvidence[0]?.includedInHistoricalHitRate, false);
});

test("SPCX keeps its existing unified list entry and independent member-depth route", () => {
  const list = readFileSync("components/conviction/ConvictionListClient.tsx", "utf8");
  const teaser = readFileSync("lib/data/conviction/watchlist-teasers.ts", "utf8");
  const page = readFileSync("app/featured-stocks/spcx/page.tsx", "utf8");
  assert.match(list, /teaser\.slug === "spcx" \|\| cardBySlug\.has\(teaser\.slug\)/);
  assert.match(teaser, /slug:\s*"spcx"/);
  assert.match(teaser, /detailHref:\s*"\/featured-stocks\/spcx"/);
  assert.match(page, /SpcxResearchPage/);
});

test("focus phase one remains display-only and imports no trading or Bitget execution modules", () => {
  const files = ["types/focus-dossier.ts", "lib/data/conviction/focus-dossier-core.ts", "lib/data/conviction/focus-research-supplements.ts", "components/conviction/FocusDossierPanel.tsx"];
  for (const file of files) {
    const source = readFileSync(file, "utf8");
    assert.doesNotMatch(source, /lib\/trading-signals|lib\/bitget|submitOrder|placeOrder/);
    assert.doesNotMatch(source, /\uFFFD/);
  }
});
