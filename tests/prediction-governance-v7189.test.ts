import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import { OFFICIAL_DIRECTION_VALUES, normalizeOfficialDirection } from "../lib/forecasts/formal-direction";
import {
  MOOX_AI_FORBIDDEN_PERMISSION,
  MOOX_DAILY_ANALYSIS_POLICY,
  MOOX_LOCK_POLICY,
  MOOX_LIUYAO_SOURCE_ARBITRATION,
  MOOX_PREDICTION_LAYERS,
  MOOX_TOP5_POLICY,
  evaluateExecutionGate,
  tradingDaysForWeeklyDerivation,
  validateLockedForecastRevision,
  validatePredictionGovernance,
} from "../lib/forecasts/prediction-governance";
import { evaluateTeacherResearch } from "../lib/research/teacher-method-evaluation-core";

test("official public direction vocabulary contains exactly seven plain labels", () => {
  assert.deepEqual(OFFICIAL_DIRECTION_VALUES, ["上涨", "震荡上涨", "先跌后涨", "震荡", "先涨后跌", "震荡下跌", "下跌"]);
  assert.equal(normalizeOfficialDirection("整固"), "震荡");
  assert.equal(normalizeOfficialDirection("探底回升"), "先跌后涨");
  assert.equal(normalizeOfficialDirection("冲高回落"), "先涨后跌");
  assert.equal(normalizeOfficialDirection("偏强确认"), "震荡上涨");
  assert.equal(normalizeOfficialDirection("回踩观察"), "震荡下跌");
});

test("only the weekly Liu Yao layer owns official direction authority", () => {
  assert.deepEqual(MOOX_PREDICTION_LAYERS.filter((layer) => layer.maySetOfficialDirection).map((layer) => layer.id), ["WEEKLY_LIUYAO"]);
  assert.ok(MOOX_PREDICTION_LAYERS.every((layer) => layer.mayChangeLockedDirection === false));
  assert.equal(MOOX_AI_FORBIDDEN_PERMISSION, "CHANGE_LOCKED_DIRECTION");
  assert.equal(MOOX_LIUYAO_SOURCE_ARBITRATION.externalLayersChooseBetweenLiuyaoCandidatesOnly, true);
  assert.equal(MOOX_LIUYAO_SOURCE_ARBITRATION.externalLayersMaySetDirectionDirectly, false);
  assert.equal(MOOX_LIUYAO_SOURCE_ARBITRATION.lockedForecastsRemainImmutable, true);
});

test("daily analysis is weekly/stage derived and never requires a daily hexagram", () => {
  assert.equal(MOOX_DAILY_ANALYSIS_POLICY.requiresDailyHexagram, false);
  assert.deepEqual(MOOX_DAILY_ANALYSIS_POLICY.allowedSources, ["WEEKLY_DERIVED", "STAGE_DERIVED"]);
  assert.deepEqual(tradingDaysForWeeklyDerivation("us", ["2026-08-21", "2026-08-22", "2026-08-23", "2026-08-24"]), ["2026-08-21", "2026-08-24"]);
  assert.equal(tradingDaysForWeeklyDerivation("crypto", ["2026-08-22", "2026-08-23"]).length, 2);
});

test("technical disagreement causes wait, not a direction flip", () => {
  const result = evaluateExecutionGate({ officialDirection: "上涨", technicalConfirmed: false, riskRewardAcceptable: true, eventRisk: "LOW" });
  assert.equal(result.officialDirection, "上涨");
  assert.equal(result.action, "WAIT");
  assert.equal(result.directionChanged, false);
});

test("AI may block execution without editing the official call", () => {
  const result = evaluateExecutionGate({ officialDirection: "先跌后涨", technicalConfirmed: true, riskRewardAcceptable: true, eventRisk: "EXTREME" });
  assert.equal(result.action, "BLOCK");
  assert.equal(result.officialDirection, "先跌后涨");
  assert.equal(result.directionChanged, false);
});

test("locked direction changes require a new version and a reason", () => {
  assert.deepEqual(validateLockedForecastRevision({ currentVersion: 1, nextVersion: 1, locked: true, directionChanged: true, revisionReason: "" }), ["LOCKED_DIRECTION_REQUIRES_NEW_VERSION", "LOCKED_REVISION_REASON_REQUIRED"]);
  assert.deepEqual(validateLockedForecastRevision({ currentVersion: 1, nextVersion: 2, locked: true, directionChanged: true, revisionReason: "新增前瞻证据" }), []);
  assert.equal(MOOX_LOCK_POLICY.preserveFailedAndPartialSamples, true);
});

test("Top-5 and A-share gates are executable-opportunity rules", () => {
  assert.equal(MOOX_TOP5_POLICY.aShareLongOnly, true);
  assert.deepEqual(validatePredictionGovernance({ direction: "下跌", isAShareTop5: true, technicalLocationReady: true, riskRewardAcceptable: true }), ["A_SHARE_TOP5_REQUIRES_BULLISH_CONSENSUS"]);
  assert.deepEqual(validatePredictionGovernance({ direction: "震荡上涨", isAShareTop5: true, technicalLocationReady: true, riskRewardAcceptable: true }), []);
});

test("teacher evaluation keeps formal direction when Chan or fundamentals disagree", () => {
  const result = evaluateTeacherResearch({
    authoritativeDirection: "BULL",
    liuyao: { originalHexagram: "地泽临", mutualHexagram: "地雷复", changedHexagram: "地天泰", movingLine: 2, direction: "BULL" },
    qimen: { chartAvailable: false, timingWindow: null },
    chan: { available: true, complete: true, direction: "BEAR" },
    fundamentals: { available: true, direction: "BEAR" },
  });
  assert.equal(result.action, "RESEARCH_CANDIDATE");
  assert.equal(result.direction, "BULL");
  assert.deepEqual(result.hardWaitReasons, []);
});

test("rulebook, public page and agent rules contain the source-locked doctrine", () => {
  const rulebook = readFileSync(resolve(process.cwd(), "lib/data/teacher-method-rulebook-20260815.ts"), "utf8");
  for (const id of ["moox-weekly-direction-lock", "moox-no-daily-hexagram", "moox-conditional-liuyao-authority", "moox-technical-no-vote", "moox-ai-risk-authority", "moox-lock-version-history", "moox-top5-actionable"]) assert.match(rulebook, new RegExp(id));
  assert.match(rulebook, /至少3名独立已批准博主/);
  const page = readFileSync(resolve(process.cwd(), "components/methodology/MethodologyPageClient.tsx"), "utf8");
  assert.match(page, /玄学定方向，缠论等位置，AI守纪律/);
  assert.match(page, /不单独要求日卦/);
  const guide = readFileSync(resolve(process.cwd(), "app/guide/page.tsx"), "utf8");
  assert.match(guide, /两份同周期六爻冲突/);
  assert.match(guide, /锁定后不事后改写/);
  const agents = readFileSync(resolve(process.cwd(), "AGENTS.md"), "utf8");
  assert.match(agents, /weekly\/stage Liuyao record owns the official/);
  assert.match(agents, /Locked publications are immutable/);
  assert.match(agents, /soft 55:45 priority/);
  assert.match(agents, /strict majority of at least three independent approved analysts/);
});
