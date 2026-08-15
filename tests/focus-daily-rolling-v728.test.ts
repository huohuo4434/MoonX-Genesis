import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { ASTEROID_PERIOD_FORECASTS, type ConvictionPeriodForecast } from "../lib/data/conviction/asteroid-forecasts";
import { buildFocusDailyPublicationBatch, focusDailyQuoteCapability } from "../lib/data/conviction/focus-daily-generation-core";
import { buildFocusDailyCoverageReport, runFocusWeekPreparation } from "../lib/data/conviction/focus-week-preparation-core";
import { buildFocusDossier, loadFocusDossierDailyAudit } from "../lib/data/conviction/focus-dossier-core";
import { selectFocusGeneratedDailyAuditRows } from "../lib/weekly-source/generated-daily-namespace-core";
import type { GeneratedDailyForecastRecord } from "../lib/weekly-source/types";
import { GET } from "../app/api/cron/prepare-focus-week/route";
import { runFocusWeekRouteHandler, type FocusRouteModuleLoader } from "../lib/data/conviction/focus-week-route-handler";

const NOW = Date.parse("2026-08-15T02:00:00.000Z");
const next = ASTEROID_PERIOD_FORECASTS.find((row) => row.id === "ASTEROID-W3-20260817-V1")!;
const current: ConvictionPeriodForecast = { ...next, id: "CURRENT-WEEK-V1", forecastType: "WEEK", periodStart: "2026-08-10", periodEnd: "2026-08-16", publishedAt: "2026-08-09T00:00:00.000Z", lockedAt: "2026-08-09T00:01:00.000Z", dailyPath: undefined, version: 1 };
const auxiliary = { evidenceKey: "closed-v1", supportLevels: ["10"], resistanceLevels: ["12"], technicalEvidence: "closed through prior day", newsEvidence: null, realizedPhase: "EARLY_RALLY" as const };

function auditRow(version: number, validationStatus: string | null, overrides: Partial<GeneratedDailyForecastRecord> = {}): GeneratedDailyForecastRecord {
  return {
    id: `audit-v${version}`, marketCode: "FOCUS:ASTEROID", forecastDate: "2026-08-13",
    sourceWeeklyForecastId: current.id, direction: version === 3 ? "NEUTRAL" : "UP",
    upProbability: 40, sidewaysProbability: 40, downProbability: 20,
    expectedPath: `audit path v${version}`, supportLevels: [], resistanceLevels: [],
    confirmationLevel: null, invalidationLevel: null, riskLevel: null, catalysts: [], risks: [],
    liuyaoEvidence: `FOCUS_SOURCE_KIND=${version === 1 ? "MOOX_WEEK_DERIVED" : "MOOX_ROLLING_REVISION"}`,
    qimenEvidence: null, calendarEvidence: null, technicalEvidence: null, newsEvidence: null,
    marketProgressStatus: "PENDING", revisionReason: version === 1 ? "initial" : `revision-v${version}`,
    previousVersionId: version === 1 ? null : `audit-v${version - 1}`, version, status: "PUBLISHED",
    generatedAt: `2026-08-1${version}T02:00:00.000Z`, publishedAt: `2026-08-1${version}T02:00:00.000Z`,
    lockedAt: `2026-08-1${version}T02:00:00.000Z`, validatedAt: validationStatus ? `2026-08-1${version}T03:00:00.000Z` : null,
    validationStatus, ...overrides,
  };
}

test("early realized rally revises only today and future, preserves the past, and remains idempotent", () => {
  const first = buildFocusDailyPublicationBatch({ assetId: "asteroid", weekly: current, asOfDate: "2026-08-13", nowMs: NOW, auxiliary, latest: [], mode: "CURRENT" });
  assert.deepEqual(first.all.map((row) => row.forecastDate), ["2026-08-13", "2026-08-14", "2026-08-15", "2026-08-16"]);
  assert.ok(first.all.slice(1).every((row) => /整固|兑现/.test(row.expectedPath)));
  assert.ok(first.all.every((row) => row.liuyaoEvidence?.includes("MOOX_ROLLING_REVISION")));
  const same = buildFocusDailyPublicationBatch({ assetId: "asteroid", weekly: current, asOfDate: "2026-08-13", nowMs: NOW + 1_000, auxiliary, latest: first.all, mode: "CURRENT" });
  assert.equal(same.append.length, 0);
  const changed = buildFocusDailyPublicationBatch({ assetId: "asteroid", weekly: current, asOfDate: "2026-08-13", nowMs: NOW + 2_000, auxiliary: { ...auxiliary, evidenceKey: "closed-v2" }, latest: first.all, mode: "CURRENT" });
  assert.ok(changed.append.every((row, index) => row.version === 2 && row.previousVersionId === first.all[index]!.id));
});

test("teacher daily remains authoritative and missing quote mapping derives path without fake levels", () => {
  const teacher = { ...next, dailyPath: [{ date: "2026-08-17", status: "预测" as const, direction: "探底回升", consensusStars: 3 as const, summary: "老师逐日路径" }] };
  const result = buildFocusDailyPublicationBatch({ assetId: "asteroid", weekly: teacher, asOfDate: "2026-08-15", nowMs: NOW, auxiliary: { evidenceKey: "MARKET_DATA_UNAVAILABLE", supportLevels: [], resistanceLevels: [], technicalEvidence: "MARKET_DATA_UNAVAILABLE", newsEvidence: null }, latest: [], mode: "NEXT" });
  assert.equal(result.all.length, 7);
  assert.equal(result.all[0]!.expectedPath, "老师逐日路径");
  assert.match(result.all[0]!.liuyaoEvidence ?? "", /TEACHER_DAILY/);
  assert.ok(result.all.slice(1).every((row) => row.direction !== "NEUTRAL"));
  assert.ok(result.all.every((row) => row.supportLevels.length === 0 && row.resistanceLevels.length === 0));
  assert.deepEqual(focusDailyQuoteCapability({ symbol: "ASTEROID" }), { available: false, market: null, quoteSymbol: null, reason: "QUOTE_MAPPING_UNAVAILABLE" });
});

test("daily orchestration authenticates before reads and keeps an asset at zero writes on dependency failure", async () => {
  let reads = 0, writes = 0;
  const unauthorized = await runFocusWeekPreparation({ authorized: false, asOfDate: "2026-08-13", nowMs: NOW, scheduleMode: "DAILY_ROLLING", readEvidence: async () => { reads += 1; return []; } });
  assert.equal(unauthorized.kind, "UNAUTHORIZED");
  assert.equal(reads, 0);
  const failed = await runFocusWeekPreparation({ authorized: true, asOfDate: "2026-08-13", nowMs: NOW, scheduleMode: "DAILY_ROLLING", readEvidence: async () => [{ assetId: "asteroid", symbol: "ASTEROID", forecasts: [current] }], loadLatest: async () => [], loadAuxiliary: async () => { throw new Error("dependency failed"); }, persistBatch: async () => { writes += 1; return { created: 0, records: [] }; } });
  assert.equal(failed.kind, "PREPARED");
  if (failed.kind === "PREPARED") assert.equal(failed.failedAssets, 1);
  assert.equal(writes, 0);
});

test("production-shared coverage classifies every reader asset and route exposes the report", () => {
  const evidence = [{ assetId: "asteroid", symbol: "ASTEROID", forecasts: [current, next] }, { assetId: "btc", symbol: "BTC", assetType: "CRYPTO", forecasts: [current] }];
  const report = buildFocusDailyCoverageReport(evidence, "2026-08-15", NOW);
  assert.deepEqual(report.map((row) => row.assetId), ["asteroid", "btc"]);
  assert.equal(report.find((row) => row.assetId === "asteroid")?.quoteMapping, "UNAVAILABLE");
  assert.equal(report.find((row) => row.assetId === "asteroid")?.nextTeacherDailyCount, 0);
  assert.equal(report.find((row) => row.assetId === "btc")?.quoteMapping, "AVAILABLE");
  assert.ok(report.every((row) => row.formalPeriodInventory.length > 0 && Array.isArray(row.gapReasons)));
  const handler = readFileSync("lib/data/conviction/focus-week-route-handler.ts", "utf8");
  assert.match(handler, /listStaticFocusEvidence/);
  assert.match(readFileSync("lib/data/conviction/focus-week-preparation-core.ts", "utf8"), /buildFocusDailyCoverageReport\(evidence/);
  assert.doesNotMatch(readFileSync("lib/data/conviction/access.ts", "utf8"), /if \(!asset\) return \[\]/);
});

test("coverage enumerates every actual static focus registry entry without a hand-maintained test list", () => {
  const access = readFileSync("lib/data/conviction/access.ts", "utf8");
  const registryBody = access.match(/STATIC_PERIOD_ASSET_IDS\s*=\s*new Set<[^>]+>\(\[([\s\S]*?)\]\);/)?.[1];
  assert.ok(registryBody, "production static focus registry must be discoverable");
  const assetIds = [...registryBody!.matchAll(/"([a-z0-9-]+)"/g)].map((match) => match[1]!);
  assert.ok(assetIds.length > 10, "coverage must use the full production focus registry");
  const report = buildFocusDailyCoverageReport(assetIds.map((assetId) => ({ assetId, symbol: assetId === "asteroid" ? "ASTEROID" : assetId.toUpperCase(), forecasts: [current, next] })), "2026-08-15", NOW);
  assert.deepEqual(report.map((row) => row.assetId).sort(), [...assetIds].sort());
  assert.ok(report.every((row) => row.formalPeriodInventory.length === 2 && row.gapReasons.every(Boolean)));
});

test("Focus rolling stays isolated from trading and preserves weekly primary verification UI", () => {
  const combined = ["lib/data/conviction/focus-daily-generation-core.ts", "lib/data/conviction/focus-week-preparation-core.ts", "components/conviction/FocusDossierPanel.tsx"].map((file) => readFileSync(file, "utf8")).join("\n");
  assert.doesNotMatch(combined, /submitOrder|executeReadyDecision|@\/lib\/bitget/);
  assert.match(combined, /周验证（核心 \/ 首要）/);
  assert.match(combined, /完整日度审计/);
});

test("FOCUS all-version audit preserves FAILED, PARTIAL and unverified rows while latest summary remains V3", () => {
  const rows = [auditRow(1, "FAILED"), auditRow(2, "PARTIAL"), auditRow(3, null), auditRow(4, "FAILED", { sourceWeeklyForecastId: "wrong-source" }), auditRow(5, "FAILED", { marketCode: "BTC" })];
  const selected = selectFocusGeneratedDailyAuditRows(rows, { marketCode: "FOCUS:ASTEROID", sourceWeeklyForecastId: current.id, periodStart: current.periodStart, periodEnd: current.periodEnd });
  assert.deepEqual(selected.map((row) => [row.version, row.validationStatus]), [[3, null], [2, "PARTIAL"], [1, "FAILED"]]);
  const dossier = buildFocusDossier({ assetId: "asteroid", forecasts: [current], asOfDate: "2026-08-13", nowMs: NOW, generatedDailies: [auditRow(3, null)], generatedDailyAudit: selected });
  assert.equal(dossier.dailyPath.find((day) => day.date === "2026-08-13")?.version, 3);
  assert.deepEqual(dossier.dailyAuditRows.map((row) => [row.version, row.validationStatus]), [[3, null], [2, "PARTIAL"], [1, "FAILED"]]);
  const panel = readFileSync("components/conviction/FocusDossierPanel.tsx", "utf8");
  assert.match(panel, /row\.validationStatus \?\? "UNVERIFIED"/);
  assert.match(panel, /dossier\.dailyAuditRows\.map/);
});

test("FOCUS audit reader is full-access only and uses exact source plus bounded namespace", async () => {
  let readerCalls = 0;
  const read = async () => { readerCalls += 1; return [auditRow(3, null)]; };
  assert.deepEqual(await loadFocusDossierDailyAudit({ accessMode: "publicOnly", dossier: { periodStart: current.periodStart, periodEnd: current.periodEnd }, marketCode: "FOCUS:ASTEROID", sourceWeeklyForecastId: current.id, read }), []);
  assert.deepEqual(await loadFocusDossierDailyAudit({ accessMode: "deviceRequired", dossier: { periodStart: current.periodStart, periodEnd: current.periodEnd }, marketCode: "FOCUS:ASTEROID", sourceWeeklyForecastId: current.id, read }), []);
  assert.equal(readerCalls, 0);
  assert.equal((await loadFocusDossierDailyAudit({ accessMode: "fullAccess", dossier: { periodStart: current.periodStart, periodEnd: current.periodEnd }, marketCode: "FOCUS:ASTEROID", sourceWeeklyForecastId: current.id, read })).length, 1);
  assert.equal(readerCalls, 1);
  const access = readFileSync("lib/data/conviction/access.ts", "utf8");
  assert.ok(access.indexOf("listFocusGeneratedDailyAuditVersions") > access.indexOf('mode: "publicOnly"'));
  const store = readFileSync("lib/weekly-source/store.ts", "utf8");
  assert.match(store, /sourceWeeklyForecastId: input\.sourceWeeklyForecastId/);
  assert.match(store, /> 62/);
  assert.match(store, /marketCode: input\.marketCode/);
});

test("cron route authenticates before loading any business module and GET POST share the handler", async () => {
  const previousSecret = process.env.CRON_SECRET;
  process.env.CRON_SECRET = "focus-test-secret";
  try {
    let moduleReaderCalls = 0;
    const loader: FocusRouteModuleLoader = async () => {
      moduleReaderCalls += 1;
      return {
        getChinaDateKey: () => "2026-08-15",
        listStaticFocusEvidence: async () => [],
        runFocusWeekPreparation: async () => ({ kind: "PREPARED", ok: true, skipped: false, asOfDate: "2026-08-15", targetStart: null, targetEnd: null, ready: 0, incomplete: 0, awaitingEvidence: 0, publishedRows: 0, unchangedAssets: 0, failedAssets: 0, errors: [], items: [], coverage: [], preservesHistoricalVersions: true, writeMode: "APPEND_ONLY" }),
        focusDailyMarketCode: (assetId: string) => `FOCUS:${assetId.toUpperCase()}`,
        listLatestGeneratedDailiesForMarketDates: async () => [],
        appendPublishedGeneratedDailyBatch: async () => ({ created: 0, records: [] }),
        loadFocusDailyAuxiliaryEvidence: async () => ({ evidenceKey: "none", supportLevels: [], resistanceLevels: [], technicalEvidence: null, newsEvidence: null }),
      };
    };
    const unauthorized = await GET(new Request("http://localhost/api/cron/prepare-focus-week") as never);
    assert.equal(unauthorized.status, 401);
    assert.equal(moduleReaderCalls, 0);
    const authorized = await runFocusWeekRouteHandler({ authorized: true, moduleLoader: loader, capturedNow: new Date("2026-08-15T02:00:00.000Z") });
    assert.equal(authorized.status, 200);
    assert.equal(moduleReaderCalls, 1);
    const route = readFileSync("app/api/cron/prepare-focus-week/route.ts", "utf8");
    assert.doesNotMatch(route, /^import\s+(?!type\b).*from\s+["']@\//m);
    assert.match(route, /if \(!authorizeCron\(request\)\)[\s\S]*await import/);
    assert.match(route, /function GET[\s\S]*return handle\(request\)/);
    assert.match(route, /function POST[\s\S]*return handle\(request\)/);
  } finally {
    if (previousSecret == null) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = previousSecret;
  }
});
