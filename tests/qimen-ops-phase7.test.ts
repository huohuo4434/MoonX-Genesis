import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import { resolveLessonProcessingProfile } from "../lib/research/lesson-processing-schedule-core";
import {
  buildQimenLearningProgress,
  presentQimenAutomationRun,
} from "../lib/research/qimen-shadow-ops-core";
import {
  isMissingResearchStoreObject,
  researchStoreReady,
  researchStoreUnavailable,
} from "../lib/research/research-store-health-core";
import { isValidMasterIntelligenceStore } from "../lib/master-intelligence/store";
import { isValidTeacherKnowledgeStore } from "../lib/teacher-knowledge/store";
import {
  isLessonAutomationRetryDue,
  registerLessonAutomationFailure,
} from "../lib/research/lesson-processing-retry-core";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

function sourceTree(path: string): string {
  return readdirSync(resolve(process.cwd(), path), { recursive: true, withFileTypes: true })
    .filter((item) => item.isFile() && /\.(?:ts|tsx|mjs)$/.test(item.name))
    .map((item) => readFileSync(resolve(item.parentPath, item.name), "utf8"))
    .join("\n");
}

test("research store health distinguishes missing objects and keeps explicit states", () => {
  assert.equal(isMissingResearchStoreObject({ statusCode: "404", message: "Object not found" }), true);
  assert.equal(isMissingResearchStoreObject({ statusCode: "500", message: "gateway failure" }), false);
  assert.equal(researchStoreReady({
    id: "teacher-knowledge",
    label: "teacher",
    backend: "SUPABASE",
    updatedAt: "2026-08-31T00:00:00.000Z",
    counts: { lessons: 2 },
    detail: "ok",
  }).initialized, true);
  assert.equal(researchStoreUnavailable({
    id: "master-intelligence",
    label: "master",
    backend: "SUPABASE",
    state: "INVALID",
    updatedAt: null,
    counts: {},
    detail: "bad",
  }).initialized, false);
});

test("research store validators reject omitted arrays, malformed fields and invalid sequence state", () => {
  const master = JSON.parse(source("data/master-intelligence-seed.json")) as Record<string, unknown>;
  const teacher = JSON.parse(source("data/teacher-knowledge-seed.json")) as Record<string, unknown>;
  assert.equal(isValidMasterIntelligenceStore(master), true);
  assert.equal(isValidTeacherKnowledgeStore(teacher), true);
  const missingMasterEdges = { ...master };
  delete missingMasterEdges.edges;
  assert.equal(isValidMasterIntelligenceStore(missingMasterEdges), false);
  assert.equal(isValidMasterIntelligenceStore({ ...master, marketWeights: {} }), false);
  const missingTeacherVersions = { ...teacher };
  delete missingTeacherVersions.versions;
  assert.equal(isValidTeacherKnowledgeStore(missingTeacherVersions), false);
  assert.equal(isValidTeacherKnowledgeStore({ ...teacher, quotes: "invalid" }), false);
  assert.equal(isValidTeacherKnowledgeStore({ ...teacher, seq: { lesson: 1, rule: -1, case: 1 } }), false);
});

test("three consecutive analysis failures exhaust automatic retries until an explicit manual reset", () => {
  const now = Date.parse("2026-08-31T00:00:00.000Z");
  const first = registerLessonAutomationFailure({}, now);
  assert.equal(first.attemptCount, 1);
  assert.equal(first.exhausted, false);
  assert.equal(isLessonAutomationRetryDue({ automationAttemptCount: 1, automationNextRetryAt: first.nextRetryAt }, now), false);
  assert.equal(isLessonAutomationRetryDue({ automationAttemptCount: 1, automationNextRetryAt: first.nextRetryAt }, now + 2 * 60 * 60 * 1_000), true);
  const second = registerLessonAutomationFailure({ automationAttemptCount: first.attemptCount }, now);
  const third = registerLessonAutomationFailure({ automationAttemptCount: second.attemptCount }, now);
  assert.equal(third.attemptCount, 3);
  assert.equal(third.exhausted, true);
  assert.equal(third.nextRetryAt, null);
  assert.equal(isLessonAutomationRetryDue({ automationAttemptCount: 3 }, now + 365 * 24 * 60 * 60 * 1_000), false);
  assert.equal(isLessonAutomationRetryDue({ automationAttemptCount: 0, automationNextRetryAt: null }, now), true);
});

test("store initialization is admin-only, missing-only and never overwrites", () => {
  const route = source("app/api/admin/research-stores/route.ts");
  const teacher = source("lib/teacher-knowledge/store.ts");
  const master = source("lib/master-intelligence/store.ts");
  assert.match(route, /await requireAdmin\(\)/);
  assert.match(route, /z\.literal\("INITIALIZE_MISSING"\)/);
  assert.match(route, /initializeSchema\.safeParse/);
  assert.match(route, /state === "INVALID" \|\| item\.state === "ERROR" \|\| item\.state === "UNCONFIGURED"/);
  assert.match(teacher, /initializeTeacherKnowledgeStoreIfMissing/);
  assert.match(master, /initializeMasterIntelligenceStoreIfMissing/);
  assert.match(teacher, /upsert: false/);
  assert.match(master, /upsert: false/);
  assert.match(master, /master-intelligence-seed\.json/);
  const masterSeed = JSON.parse(source("data/master-intelligence-seed.json")) as {
    publishedRules?: unknown[];
    ruleTree?: unknown[];
  };
  assert.ok((masterSeed.publishedRules?.length ?? 0) > 0);
  assert.ok((masterSeed.ruleTree?.length ?? 0) > 0);
  assert.doesNotMatch(JSON.stringify(masterSeed), /api[_-]?key|secret|password|cookie|ct0/i);
  const executionSources = [
    sourceTree("lib/trading-signals"),
    sourceTree("lib/bitget"),
    source("app/api/cron/prediction-auto-trader/route.ts"),
    source("app/api/cron/live-trading-custodian/route.ts"),
  ].join("\n");
  assert.doesNotMatch(executionSources, /master-intelligence-seed|listMarketWeights|marketWeights/);
  assert.match(teacher, /if \(isValidTeacherKnowledgeStore\(parsed\)\) return \{ id: "teacher-knowledge", outcome: "ALREADY_READY" \}/);
  assert.match(master, /if \(isValidMasterIntelligenceStore\(parsed\)\) return \{ id: "master-intelligence", outcome: "ALREADY_READY" \}/);
  assert.match(teacher, /if \(!isValidTeacherKnowledgeStore\(currentRaw\)\)/);
  assert.match(master, /if \(!isValidMasterIntelligenceStore\(current\)\)/);
  assert.doesNotMatch(route, /bitget|live-trading|prediction-auto-trader/i);
});

test("automation status explains idle, partial and fail-closed behavior", () => {
  const idle = presentQimenAutomationRun({
    status: "IDLE",
    finishedAt: new Date("2026-08-31T00:01:00.000Z"),
    reportSnapshot: { locks: [], evaluations: [], pairings: [], lessonIngestion: [] },
  });
  assert.equal(idle.status, "正常待机");
  assert.match(idle.detail, /不是故障/);
  assert.equal(idle.nextRunAt, "2026-08-31T00:05:00.000Z");

  const partial = presentQimenAutomationRun({
    status: "PARTIAL",
    finishedAt: new Date("2026-08-31T00:01:00.000Z"),
    reportSnapshot: { locks: [{ status: "FAILED", reason: "CLOSED_KLINE_UNAVAILABLE" }] },
  });
  assert.equal(partial.status, "部分失败");
  assert.equal(partial.failed, 1);
  assert.match(partial.headline, /失败关闭/);
  assert.match(partial.detail, /CLOSED_KLINE_UNAVAILABLE/);
});

test("method progress uses the strictest of observation, days and entered gates", () => {
  const [row] = buildQimenLearningProgress([{
    variantId: "OBJECT_YONGSHEN_FILTER",
    observations: 30,
    entered: 5,
    waited: 25,
    positiveOutcomes: 2,
    stoppedFirst: 1,
    avoidedBaselineLosses: 0,
    averageR: 0.1,
    profitFactor: 1.1,
    averageMfeR: 0.2,
    averageMaeR: -0.1,
    stableDays: 30,
    sampleReady: true,
    researchQualified: false,
    mayEnableLive: false,
  }]);
  assert.equal(row?.observationPercent, 100);
  assert.equal(row?.stableDaysPercent, 100);
  assert.equal(row?.enteredPercent, 50);
  assert.equal(row?.overallPercent, 50);
  assert.match(row?.nextNeed ?? "", /5 次有效模拟入场/);
  assert.equal(row?.mayEnableLive, false);
});

test("lesson processing runs every two hours with one bounded daily catch-up", () => {
  const compensation = resolveLessonProcessingProfile(new Date("2026-08-31T14:20:00.000Z"));
  const catchUp = resolveLessonProcessingProfile(new Date("2026-08-31T16:20:00.000Z"));
  assert.equal(compensation.mode, "TWO_HOUR_COMPENSATION");
  assert.equal(compensation.masterPendingLimit, 2);
  assert.equal(catchUp.mode, "DAILY_CATCH_UP");
  assert.ok(catchUp.masterPendingLimit > compensation.masterPendingLimit);
  assert.equal(JSON.parse(source("vercel.json")).crons.find((row: { path: string }) => row.path === "/api/cron/process-lessons")?.schedule, "20 */2 * * *");
});

test("uploads advance immediately and cron retains authorization and deadline", () => {
  const masterUpload = source("app/api/admin/lessons/upload/route.ts");
  const teacherUpload = source("app/api/admin/teacher-knowledge/lessons/route.ts");
  const manualMasterRoute = source("app/api/admin/lessons/[id]/route.ts");
  const cron = source("app/api/cron/process-lessons/route.ts");
  const pipeline = source("lib/master-intelligence/pipeline.ts");
  const storage = source("lib/master-intelligence/storage.ts");
  const teacherPipeline = source("lib/teacher-knowledge/pipeline.ts");
  assert.match(masterUpload, /processLessonToReview/);
  assert.match(masterUpload, /const requestStartedMs = Date\.now\(\)/);
  assert.match(masterUpload, /deadlineMs: requestStartedMs \+ 55_000/);
  assert.match(teacherUpload, /analyzeTeacherKnowledgeLesson/);
  assert.match(manualMasterRoute, /processLessonToReview/);
  assert.doesNotMatch(manualMasterRoute, /processLessonOnce/);
  assert.match(manualMasterRoute, /deadlineMs: requestStartedMs \+ 55_000/);
  assert.match(teacherUpload, /deadlineMs: requestStartedMs \+ 55_000/);
  assert.match(teacherUpload, /QUEUED_RETRY/);
  assert.match(pipeline, /processLessonToReview/);
  assert.match(pipeline, /lesson\.status === "UPLOADED" \|\| lesson\.status === "TRANSCRIBING" \|\| lesson\.status === "FAILED"/);
  assert.match(pipeline, /lesson\.status === "TRANSCRIBED" \|\| lesson\.status === "ANALYZING"/);
  assert.match(pipeline, /l\.status === "UPLOADED" \|\| l\.status === "TRANSCRIBING"/);
  assert.match(pipeline, /Date\.now\(\) - 120_000/);
  assert.match(pipeline, /l\.updatedAt <= pickupBefore/);
  assert.match(pipeline, /l\.status === "FAILED"/);
  assert.match(pipeline, /acquireQimenLessonProcessingLease/);
  assert.match(pipeline, /left\.updatedAt\.localeCompare\(right\.updatedAt\)/);
  assert.doesNotMatch(pipeline, /Scheduled run skips unbounded media download/);
  assert.match(storage, /createSignedUrl/);
  assert.match(storage, /AbortSignal\.timeout/);
  assert.match(teacherPipeline, /acquireQimenLessonProcessingLease/);
  assert.match(teacherPipeline, /touchTeacherKnowledgeLessonProcessingAttempt/);
  assert.match(teacherPipeline, /isLessonAutomationRetryDue/);
  assert.match(pipeline, /isLessonAutomationRetryDue/);
  assert.match(manualMasterRoute, /automationAttemptCount: 0/);
  assert.equal((pipeline.match(/automationAttemptCount: 0/g) ?? []).length, 1);
  assert.match(teacherPipeline, /left\.updatedAt\.localeCompare\(right\.updatedAt\)/);
  assert.match(cron, /authorization.*Bearer/);
  assert.match(cron, /const deadlineMs = requestStartedMs \+ 55_000/);
  assert.match(cron, /resolveLessonProcessingProfile/);
  assert.doesNotMatch(cron, /bitget|live-trading|prediction-auto-trader/i);
});

test("admin dashboard exposes readable status and exact learning gates", () => {
  const page = source("app/admin/qimen-shadow/page.tsx");
  assert.match(page, /自动采集状态/);
  assert.match(page, /方法学习进度/);
  assert.match(page, /对象用神读数/);
  assert.match(page, /仍不得直接接入 LIVE|只做前瞻研究/);
});

test("one admin inbox routes each material type without bypassing research governance", () => {
  const page = source("app/admin/research-ingest/page.tsx");
  const nav = source("components/admin/AdminNav.tsx");
  assert.match(page, /requireAdminOrNotFound/);
  assert.match(page, /音频／视频课程/);
  assert.match(page, /已有文字／截图转写/);
  assert.match(page, /单一品种研究材料/);
  assert.match(page, /RESEARCH_ONLY/);
  assert.match(nav, /\/admin\/research-ingest/);
  assert.doesNotMatch(page, /bitget|live-trading|prediction-auto-trader/i);
});
