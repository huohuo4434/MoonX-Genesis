import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ASTEROID_PERIOD_FORECASTS, type ConvictionPeriodForecast } from "../lib/data/conviction/asteroid-forecasts";
import { buildFocusDossier, buildMemberFocusDossier, prepareNextFocusWeek } from "../lib/data/conviction/focus-dossier-core";
import { runFocusWeekPreparation } from "../lib/data/conviction/focus-week-preparation-core";

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
  assert.equal(prepared.immutable, true);
});

test("Saturday evidence reader failure propagates and cannot become a successful report", async () => {
  let readerCalls = 0;
  await assert.rejects(runFocusWeekPreparation({
    authorized: true, asOfDate: "2026-08-15", nowMs: NOW,
    readEvidence: async () => { readerCalls += 1; throw new Error("read unavailable"); },
  }), /read unavailable/);
  assert.equal(readerCalls, 1);
});

test("Saturday cron is authenticated, read-only and scheduled as Saturday 10:00 Beijing", () => {
  const route = readFileSync("app/api/cron/prepare-focus-week/route.ts", "utf8");
  const orchestration = readFileSync("lib/data/conviction/focus-week-preparation-core.ts", "utf8");
  const access = readFileSync("lib/data/conviction/access.ts", "utf8");
  const page = readFileSync("components/conviction/ConvictionDetailClient.tsx", "utf8");
  const vercel = JSON.parse(readFileSync("vercel.json", "utf8")) as { crons: Array<{ path: string; schedule: string }> };
  assert.match(route, /CRON_SECRET/);
  assert.match(orchestration, /SATURDAY_ONLY/);
  assert.match(route, /runFocusWeekPreparation/);
  assert.match(route, /export const GET = handleFocusWeekPreparation/);
  assert.match(route, /export const POST = handleFocusWeekPreparation/);
  assert.match(route, /PREPARATION_EVIDENCE_UNAVAILABLE/);
  assert.doesNotMatch(route, /INSERT|UPDATE|DELETE|upsert|create\(/i);
  assert.match(access, /focusDossier: null/);
  assert.match(page, /payload\.mode === "fullAccess" && payload\.focusDossier/);
  assert.deepEqual(vercel.crons.find((item) => item.path === "/api/cron/prepare-focus-week"), { path: "/api/cron/prepare-focus-week", schedule: "0 2 * * 6" });
});

test("focus dossier UI is canonical UTF-8 and keeps long-term evidence separate", () => {
  const files = ["types/focus-dossier.ts", "lib/data/conviction/focus-dossier-core.ts", "components/conviction/FocusDossierPanel.tsx"];
  for (const file of files) {
    const source = readFileSync(file, "utf8");
    assert.doesNotMatch(source, /\uFFFD|Ã|â€™|鈥|锟斤拷/);
  }
  const panel = readFileSync("components/conviction/FocusDossierPanel.tsx", "utf8");
  assert.match(panel, /RESEARCH_ONLY/);
  assert.match(panel, /未提供版本号/);
  assert.match(panel, /未提供锁定时间，不声明已锁定/);
  assert.match(panel, /本周唯一结论/);
  assert.match(panel, /7日路径/);
  assert.match(panel, /长期背景（不替代本周结论）/);
});
