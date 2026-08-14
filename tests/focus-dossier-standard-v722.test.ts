import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ASTEROID_PERIOD_FORECASTS, type ConvictionPeriodForecast } from "../lib/data/conviction/asteroid-forecasts";
import { buildFocusDossier, buildMemberFocusDossier, prepareNextFocusWeek } from "../lib/data/conviction/focus-dossier-core";
import { runFocusWeekPreparation } from "../lib/data/conviction/focus-week-preparation-core";
import { buildFocusDailyPublicationBatch, executeAtomicFocusDailyAppend, filterClosedFocusDailyBars, focusDailyMarketCode, selectFormalNextFocusWeek } from "../lib/data/conviction/focus-daily-generation-core";
import { UnifiedDossierDisclosure } from "../components/conviction/UnifiedDossierDisclosure";
import { filterPublicGeneratedDailyRows, isPublicGeneratedDailyMarketCode } from "../lib/weekly-source/generated-daily-namespace-core";

const NOW = Date.parse("2026-08-14T08:00:00+08:00");

test("asteroid current week rolls by date and exposes one seven-day dossier without using the expired week", () => {
  const dossier = buildFocusDossier({ assetId: "asteroid", forecasts: ASTEROID_PERIOD_FORECASTS, asOfDate: "2026-08-14", nowMs: NOW });
  assert.equal(dossier.periodStart, "2026-08-10");
  assert.equal(dossier.periodEnd, "2026-08-16");
  assert.equal(dossier.dailyPath.length, 7);
  assert.equal(dossier.evidenceStatus, "READY");
  assert.ok(dossier.dailyPath.some((day) => day.date === "2026-08-14" && day.state === "TODAY"));
  assert.equal(dossier.version, 2);
  assert.equal(dossier.publicationStatus, "PUBLISHED");
  assert.equal(dossier.lockStatus, "LOCKED");
  assert.equal(dossier.executionAuthority, "RESEARCH_ONLY");
  assert.equal(dossier.tradingEligible, false);
  assert.match(dossier.longTermBackground ?? "", /一年|修复|抬升/);
});

test("next asteroid week uses the existing locked forecast but refuses to invent missing daily evidence", () => {
  const dossier = buildFocusDossier({ assetId: "asteroid", forecasts: ASTEROID_PERIOD_FORECASTS, asOfDate: "2026-08-14", nowMs: NOW });
  assert.deepEqual(dossier.nextWeek && { start: dossier.nextWeek.periodStart, end: dossier.nextWeek.periodEnd, ready: dossier.nextWeek.dailyEvidenceReady }, {
    start: "2026-08-17", end: "2026-08-23", ready: false,
  });
  const preparation = prepareNextFocusWeek({ assetId: "asteroid", forecasts: ASTEROID_PERIOD_FORECASTS, asOfDate: "2026-08-15", nowMs: Date.parse("2026-08-15T10:00:00+08:00") });
  assert.equal(preparation.status, "EVIDENCE_INCOMPLETE");
  assert.deepEqual(preparation.missingDates, ["2026-08-17", "2026-08-18", "2026-08-19", "2026-08-20", "2026-08-21", "2026-08-22", "2026-08-23"]);
});

test("missing, draft, future-published and partial evidence fail closed with explicit gaps", () => {
  const base = ASTEROID_PERIOD_FORECASTS.find((item) => item.id === "ASTEROID-W3-20260817-V1")!;
  const future = { ...base, id: "future", publishedAt: "2026-08-16T00:00:00+08:00", lockedAt: "2026-08-16T00:00:00+08:00" };
  const draft = { ...base, id: "draft", status: "draft" as const };
  assert.equal(prepareNextFocusWeek({ assetId: "x", forecasts: [future, draft], asOfDate: "2026-08-15", nowMs: Date.parse("2026-08-15T10:00:00+08:00") }).status, "AWAITING_FORMAL_EVIDENCE");

  const partial: ConvictionPeriodForecast = { ...base, id: "partial", dailyPath: [{ date: "2026-08-17", status: "预测", direction: "震荡", consensusStars: 3, summary: "仅有正式首日资料" }] };
  const result = prepareNextFocusWeek({ assetId: "x", forecasts: [partial], asOfDate: "2026-08-15", nowMs: Date.parse("2026-08-15T10:00:00+08:00") });
  assert.equal(result.status, "EVIDENCE_INCOMPLETE");
  assert.equal(result.missingDates.length, 6);
});

test("database-backed focus assets use the same dossier and expose missing days without fabrication", () => {
  const dossier = buildMemberFocusDossier({
    assetId: "stock-x", asOfDate: "2026-08-14", nowMs: NOW,
    weekly: {
      id: "week-1", weekStart: "2026-08-10", weekEnd: "2026-08-16", overallDirection: "震荡偏涨",
      headline: "本周正式结论", weeklyPath: "先整理后验证", keySupport: ["正式支撑"], keyResistance: ["正式压力"],
      confirmation: "确认条件", invalidation: "失效条件", publishedAt: "2026-08-09T10:00:00+08:00", status: "published", publicSourceLabel: "MOOX正式周报",
    },
    daily: [{ forecastDate: "2026-08-14", direction: "区间震荡", headline: "今日正式路径", confirmation: "今日确认", invalidation: "今日失效", status: "published", publishedAt: "2026-08-13T20:00:00+08:00" }, null],
  });
  assert.equal(dossier.evidenceStatus, "INCOMPLETE");
  assert.equal(dossier.dailyPath.length, 7);
  assert.equal(dossier.dailyPath.filter((day) => day.state === "MISSING").length, 6);
  assert.match(dossier.conclusion ?? "", /本周正式结论/);
});

test("database publication, source, version and lock claims remain distinct", () => {
  const dossier = buildMemberFocusDossier({
    assetId: "stock-x", asOfDate: "2026-08-14", nowMs: NOW,
    weekly: {
      id: "week-1", weekStart: "2026-08-10", weekEnd: "2026-08-16", overallDirection: "range",
      headline: "published report", weeklyPath: "weekly path", keySupport: [], keyResistance: [],
      invalidation: "invalid", publishedAt: "2026-08-09T10:00:00+08:00", status: "published", publicSourceLabel: "MOOX weekly database",
    },
    daily: [],
  });
  assert.equal(dossier.publicationStatus, "PUBLISHED");
  assert.equal(dossier.version, null);
  assert.equal(dossier.source, "MOOX weekly database");
  assert.equal(dossier.lockStatus, "LOCK_NOT_PROVIDED");
  assert.equal(dossier.lockedAt, null);
  assert.equal(dossier.executionAuthority, "RESEARCH_ONLY");
  assert.equal(dossier.tradingEligible, false);
});

test("read-only Saturday orchestration gates before reading and reports all evidence outcomes", async () => {
  let readerCalls = 0;
  const readEvidence = async () => {
    readerCalls += 1;
    return [];
  };
  const unauthorized = await runFocusWeekPreparation({ authorized: false, asOfDate: "2026-08-15", nowMs: NOW, readEvidence });
  assert.equal(unauthorized.kind, "UNAUTHORIZED");
  assert.equal(readerCalls, 0);
  const weekday = await runFocusWeekPreparation({ authorized: true, asOfDate: "2026-08-14", nowMs: NOW, readEvidence });
  assert.equal(weekday.kind, "NOT_SATURDAY");
  assert.equal(readerCalls, 0);

  const base = ASTEROID_PERIOD_FORECASTS.find((item) => item.id === "ASTEROID-W3-20260817-V1")!;
  const ready: ConvictionPeriodForecast = {
    ...base,
    id: "ready",
    dailyPath: ["17", "18", "19", "20", "21", "22", "23"].map((day) => ({
      date: `2026-08-${day}`, status: "预测", direction: "震荡", consensusStars: 3, summary: `formal evidence ${day}`,
    })),
  };
  const incomplete: ConvictionPeriodForecast = { ...base, id: "incomplete", dailyPath: ready.dailyPath?.slice(0, 1) };
  const prepared = await runFocusWeekPreparation({
    authorized: true, asOfDate: "2026-08-15", nowMs: NOW,
    readEvidence: async () => {
      readerCalls += 1;
      return [
        { assetId: "ready", forecasts: [ready] },
        { assetId: "incomplete", forecasts: [incomplete] },
        { assetId: "awaiting", forecasts: [] },
      ];
    },
  });
  assert.equal(readerCalls, 1);
  assert.equal(prepared.kind, "PREPARED");
  if (prepared.kind !== "PREPARED") assert.fail("Saturday preparation must run");
  assert.deepEqual({ ready: prepared.ready, incomplete: prepared.incomplete, awaiting: prepared.awaitingEvidence }, { ready: 1, incomplete: 1, awaiting: 1 });
  assert.deepEqual(prepared.items.map((item) => item.status), ["READY", "EVIDENCE_INCOMPLETE", "AWAITING_FORMAL_EVIDENCE"]);
  assert.equal(prepared.preservesHistoricalVersions, true);
  assert.equal(prepared.writeMode, "APPEND_ONLY");
});

test("Saturday evidence reader failure propagates and cannot become a successful report", async () => {
  let readerCalls = 0;
  await assert.rejects(runFocusWeekPreparation({
    authorized: true, asOfDate: "2026-08-15", nowMs: NOW,
    readEvidence: async () => { readerCalls += 1; throw new Error("read unavailable"); },
  }), /read unavailable/);
  assert.equal(readerCalls, 1);
});

test("formal locked next week publishes seven isolated append-only research days without mechanically splitting missing daily evidence", () => {
  const base = ASTEROID_PERIOD_FORECASTS.find((item) => item.id === "ASTEROID-W3-20260817-V1")!;
  assert.equal(selectFormalNextFocusWeek({ forecasts: [base], asOfDate: "2026-08-15", nowMs: NOW })?.id, base.id);
  assert.equal(selectFormalNextFocusWeek({ forecasts: [{ ...base, status: "draft" }], asOfDate: "2026-08-15", nowMs: NOW }), null);
  assert.equal(selectFormalNextFocusWeek({ forecasts: [{ ...base, lockedAt: "2026-08-16T00:00:00+08:00" }], asOfDate: "2026-08-15", nowMs: NOW }), null);
  const auxiliary = { evidenceKey: "closed-bars+x-v1", supportLevels: ["10"], resistanceLevels: ["12"], technicalEvidence: "closed bars", newsEvidence: "X research only" };
  const first = buildFocusDailyPublicationBatch({ assetId: "asteroid", weekly: base, asOfDate: "2026-08-15", nowMs: NOW, auxiliary, latest: [] });
  assert.equal(first.all.length, 7);
  assert.equal(first.append.length, 7);
  assert.ok(first.all.every((row) => row.marketCode === "FOCUS:ASTEROID" && row.status === "PUBLISHED" && row.lockedAt === null));
  assert.ok(first.all.every((row) => row.direction === "NEUTRAL" && /不从周卦机械拆分/.test(row.expectedPath)));
  assert.ok(first.all.every((row) => row.previousVersionId === null && row.version === 1));

  const repeated = buildFocusDailyPublicationBatch({ assetId: "asteroid", weekly: base, asOfDate: "2026-08-15", nowMs: NOW + 60_000, auxiliary, latest: first.all });
  assert.equal(repeated.append.length, 0);
  const revised = buildFocusDailyPublicationBatch({ assetId: "asteroid", weekly: base, asOfDate: "2026-08-15", nowMs: NOW + 60_000, auxiliary: { ...auxiliary, evidenceKey: "closed-bars+x-v2" }, latest: first.all });
  assert.equal(revised.append.length, 7);
  assert.ok(revised.append.every((row, index) => row.version === 2 && row.previousVersionId === first.all[index]!.id));
  assert.equal(focusDailyMarketCode("btc"), "FOCUS:BTC");
});

test("original formal dailyPath wins while auxiliary evidence cannot change its direction", () => {
  const base = ASTEROID_PERIOD_FORECASTS.find((item) => item.id === "ASTEROID-W3-20260817-V1")!;
  const weekly: ConvictionPeriodForecast = { ...base, dailyPath: [{ date: "2026-08-17", status: "预测", direction: "探底回升", consensusStars: 3, summary: "原始正式逐日证据" }] };
  const result = buildFocusDailyPublicationBatch({
    assetId: "asteroid", weekly, asOfDate: "2026-08-15", nowMs: NOW,
    auxiliary: { evidenceKey: "bearish-x", supportLevels: [], resistanceLevels: [], technicalEvidence: "technical bearish", newsEvidence: "X bearish" }, latest: [],
  });
  assert.equal(result.all[0]?.direction, "探底回升");
  assert.equal(result.all[0]?.expectedPath, "原始正式逐日证据");
  assert.equal(result.all[1]?.direction, "NEUTRAL");
});

test("member dossier prefers authoritative persisted focus versions only for the matching locked weekly source", () => {
  const weekly = ASTEROID_PERIOD_FORECASTS.find((item) => item.id === "ASTEROID-W3-20260817-V1")!;
  const batch = buildFocusDailyPublicationBatch({ assetId: "asteroid", weekly, asOfDate: "2026-08-15", nowMs: NOW, auxiliary: { evidenceKey: "v1", supportLevels: [], resistanceLevels: [], technicalEvidence: "closed", newsEvidence: null }, latest: [] });
  const dossier = buildFocusDossier({ assetId: "asteroid", forecasts: ASTEROID_PERIOD_FORECASTS, asOfDate: "2026-08-18", nowMs: NOW + 4 * 86_400_000, generatedDailies: batch.all });
  assert.equal(dossier.dailyPath.length, 7);
  assert.ok(dossier.dailyPath.every((day) => day.state !== "MISSING"));
  assert.ok(dossier.dailyPath.every((day) => day.direction === "观察"));
  const stale = buildFocusDossier({ assetId: "asteroid", forecasts: ASTEROID_PERIOD_FORECASTS, asOfDate: "2026-08-18", nowMs: NOW + 4 * 86_400_000, generatedDailies: batch.all.map((row) => ({ ...row, sourceWeeklyForecastId: "other-week" })) });
  assert.ok(stale.dailyPath.some((day) => day.state === "MISSING"));
});

test("public forecast and prediction-auto default namespace filter cannot observe FOCUS rows", () => {
  const rows = [
    { marketCode: "BTC", id: "public-btc" },
    { marketCode: "FOCUS:BTC", id: "member-focus" },
    { marketCode: "FOCUS:ASTEROID", id: "member-asteroid" },
  ];
  assert.deepEqual(filterPublicGeneratedDailyRows(rows).map((row) => row.id), ["public-btc"]);
  assert.equal(isPublicGeneratedDailyMarketCode("FOCUS:BTC"), false);
  assert.equal(isPublicGeneratedDailyMarketCode("BTC"), true);
  const store = readFileSync("lib/weekly-source/store.ts", "utf8");
  const publicAccess = readFileSync("lib/prediction-access-server.ts", "utf8");
  const autoTrader = readFileSync("lib/trading-signals/prediction-auto-trader.ts", "utf8");
  assert.match(store, /not: \{ startsWith: "FOCUS:" \}/);
  assert.match(store, /filterPublicGeneratedDailyRows\(rows\)/);
  assert.match(publicAccess, /listGeneratedDailiesForDate/);
  assert.match(autoTrader, /listGeneratedDailiesForDate/);
});

test("Saturday evidence excludes the current calendar day candle and keeps only prior closed bars", () => {
  const closed = filterClosedFocusDailyBars([
    { date: "2026-08-13", open: 10, high: 12, low: 9, close: 11 },
    { date: "2026-08-14", open: 11, high: 13, low: 10, close: 12 },
    { date: "2026-08-15", open: 12, high: 999, low: 1, close: 500 },
    { date: "2026-08-12", open: 10, high: 11, low: 9, close: 10, synthetic: true },
  ], "2026-08-15");
  assert.deepEqual(closed.map((bar) => bar.date), ["2026-08-13", "2026-08-14"]);
  assert.equal(Math.max(...closed.map((bar) => bar.high)), 13);
  assert.equal(Math.min(...closed.map((bar) => bar.low)), 9);
});

test("atomic focus append uses one all-row transaction, rolls back failures and authoritatively rereads P2002 winners", async () => {
  const base = ASTEROID_PERIOD_FORECASTS.find((item) => item.id === "ASTEROID-W3-20260817-V1")!;
  const rows = buildFocusDailyPublicationBatch({ assetId: "asteroid", weekly: base, asOfDate: "2026-08-15", nowMs: NOW, auxiliary: { evidenceKey: "v1", supportLevels: [], resistanceLevels: [], technicalEvidence: "none", newsEvidence: null }, latest: [] }).append;
  let transactionCalls = 0;
  const success = await executeAtomicFocusDailyAppend({ records: rows, writeAll: async (batch) => { transactionCalls += 1; assert.equal(batch.length, 7); return [...batch]; }, isUniqueConflict: () => false, readWinners: async () => [] });
  assert.equal(transactionCalls, 1);
  assert.equal(success.created, 7);

  let persisted = 0;
  await assert.rejects(executeAtomicFocusDailyAppend({ records: rows, writeAll: async () => { const staged = 7; assert.equal(staged, 7); throw new Error("transaction rollback"); }, isUniqueConflict: () => false, readWinners: async () => [] }), /transaction rollback/);
  assert.equal(persisted, 0);

  const p2002 = Object.assign(new Error("unique"), { code: "P2002" });
  const winner = await executeAtomicFocusDailyAppend({ records: rows, writeAll: async () => { throw p2002; }, isUniqueConflict: (error) => (error as { code?: string }).code === "P2002", readWinners: async () => [...rows] });
  assert.equal(winner.created, 0);
  assert.equal(winner.records.length, 7);
});

test("Saturday publication fails one asset closed before persistence when market or X evidence fails", async () => {
  const base = ASTEROID_PERIOD_FORECASTS.find((item) => item.id === "ASTEROID-W3-20260817-V1")!;
  let latestCalls = 0;
  let auxiliaryCalls = 0;
  let persistCalls = 0;
  const result = await runFocusWeekPreparation({
    authorized: true, asOfDate: "2026-08-15", nowMs: NOW,
    readEvidence: async () => [{ assetId: "asteroid", symbol: "ASTEROID", assetType: "CRYPTO", forecasts: [base] }],
    loadLatest: async () => { latestCalls += 1; return []; },
    loadAuxiliary: async () => { auxiliaryCalls += 1; throw new Error("provider unavailable"); },
    persistBatch: async () => { persistCalls += 1; return { created: 0, records: [] }; },
  });
  assert.equal(result.kind, "PREPARED");
  if (result.kind !== "PREPARED") assert.fail("expected preparation report");
  assert.equal(result.ok, false);
  assert.equal(result.failedAssets, 1);
  assert.deepEqual({ latestCalls, auxiliaryCalls, persistCalls }, { latestCalls: 1, auxiliaryCalls: 1, persistCalls: 0 });
});

test("Saturday publication persists one seven-row batch and skips all dependencies without formal next-week evidence", async () => {
  const base = ASTEROID_PERIOD_FORECASTS.find((item) => item.id === "ASTEROID-W3-20260817-V1")!;
  let latestCalls = 0;
  let auxiliaryCalls = 0;
  let persistCalls = 0;
  const result = await runFocusWeekPreparation({
    authorized: true, asOfDate: "2026-08-15", nowMs: NOW,
    readEvidence: async () => [
      { assetId: "asteroid", symbol: "ASTEROID", assetType: "CRYPTO", forecasts: [base] },
      { assetId: "awaiting", symbol: "NONE", assetType: "STOCK", forecasts: [] },
    ],
    loadLatest: async () => { latestCalls += 1; return []; },
    loadAuxiliary: async () => { auxiliaryCalls += 1; return { evidenceKey: "v1", supportLevels: [], resistanceLevels: [], technicalEvidence: "no mapping", newsEvidence: null }; },
    persistBatch: async (records) => { persistCalls += 1; assert.equal(records.length, 7); return { created: 7, records: [...records] }; },
  });
  assert.equal(result.kind, "PREPARED");
  if (result.kind !== "PREPARED") assert.fail("expected prepared result");
  assert.equal(result.ok, true);
  assert.equal(result.publishedRows, 7);
  assert.deepEqual({ latestCalls, auxiliaryCalls, persistCalls }, { latestCalls: 1, auxiliaryCalls: 1, persistCalls: 1 });
});

test("Saturday cron is authenticated, append-only and scheduled as Saturday 10:00 Beijing", () => {
  const route = readFileSync("app/api/cron/prepare-focus-week/route.ts", "utf8");
  const orchestration = readFileSync("lib/data/conviction/focus-week-preparation-core.ts", "utf8");
  const access = readFileSync("lib/data/conviction/access.ts", "utf8");
  const page = readFileSync("components/conviction/ConvictionDetailClient.tsx", "utf8");
  const verificationSync = readFileSync("lib/verification/sync-generated-dailies.ts", "utf8");
  const vercel = JSON.parse(readFileSync("vercel.json", "utf8")) as { crons: Array<{ path: string; schedule: string }> };
  assert.match(route, /CRON_SECRET/);
  assert.match(orchestration, /SATURDAY_ONLY/);
  assert.match(route, /runFocusWeekPreparation/);
  assert.match(route, /export const GET = handleFocusWeekPreparation/);
  assert.match(route, /export const POST = handleFocusWeekPreparation/);
  assert.match(route, /PREPARATION_EVIDENCE_UNAVAILABLE/);
  assert.doesNotMatch(route, /INSERT|UPDATE|DELETE|upsert|create\(/i);
  assert.match(access, /focusDossier: null/);
  const publicReturn = access.indexOf('mode: "publicOnly"');
  const persistedReader = access.indexOf('await import("@\/lib\/weekly-source\/store")');
  assert.ok(publicReturn >= 0 && persistedReader > publicReturn, "persisted focus reader must stay after the public/device gate return");
  assert.match(access, /readOnly: true/);
  assert.match(page, /payload\.mode === "fullAccess" && payload\.focusDossier/);
  assert.match(verificationSync, /startsWith: "FOCUS:"/);
  assert.deepEqual(vercel.crons.find((item) => item.path === "/api/cron/prepare-focus-week"), { path: "/api/cron/prepare-focus-week", schedule: "0 2 * * 6" });
});

test("focus dossier UI is canonical UTF-8 and keeps long-term evidence separate", () => {
  const files = ["types/focus-dossier.ts", "lib/data/conviction/focus-dossier-core.ts", "lib/data/conviction/focus-research-supplements.ts", "components/conviction/FocusDossierPanel.tsx"];
  for (const file of files) {
    const source = readFileSync(file, "utf8");
    assert.doesNotMatch(source, /\uFFFD|Ã|â€™|鈥|锟斤拷/);
  }
  const panel = readFileSync("components/conviction/FocusDossierPanel.tsx", "utf8");
  assert.match(panel, /RESEARCH_ONLY/);
  assert.match(panel, /未提供版本号/);
  assert.match(panel, /未提供锁定时间，不声明已锁定/);
  assert.match(panel, /本期唯一结论/);
  assert.match(panel, /本期逐日路径/);
  assert.match(panel, /长期背景（不替代本期结论）/);
});

test("unified member layout renders supporting research inside closed accessible disclosures", () => {
  const collapsed = renderToStaticMarkup(createElement(
    UnifiedDossierDisclosure,
    { enabled: true, title: "完整研究依据与历史版本" },
    createElement("section", { "data-testid": "period-panel" }, "旧周期逐日路径仍可访问")
  ));
  assert.match(collapsed, /^<details /);
  assert.doesNotMatch(collapsed, /<details[^>]*\sopen(?:=|\s|>)/);
  assert.match(collapsed, /<summary[^>]*>完整研究依据与历史版本<\/summary>/);
  assert.match(collapsed, /data-testid="period-panel"/);
  assert.match(collapsed, /旧周期逐日路径仍可访问/);

  const unchangedFallback = renderToStaticMarkup(createElement(
    UnifiedDossierDisclosure,
    { enabled: false, title: "不应出现的折叠标题" },
    createElement("section", { "data-testid": "legacy-layout" }, "旧页面保持原展示")
  ));
  assert.doesNotMatch(unchangedFallback, /<details|<summary|不应出现的折叠标题/);
  assert.match(unchangedFallback, /data-testid="legacy-layout"/);

  const page = readFileSync("components/conviction/ConvictionDetailClient.tsx", "utf8");
  assert.equal((page.match(/title="资产背景与风险"/g) ?? []).length, 1);
  assert.equal((page.match(/title="完整研究依据与历史版本"/g) ?? []).length, 1);
  assert.match(page, /enabled=\{hasUnifiedDossier\}/);
});
