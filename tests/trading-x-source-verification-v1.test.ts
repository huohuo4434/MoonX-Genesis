// High-risk trading-signals regression: external research remains research-only.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import {
  buildXSourceVerificationStats,
  canonicalXSourceActualSymbol,
  isXSourceVerifiableSymbol,
  scoreXSourceDirection,
  selectXVerificationDate,
  type XSourceVerificationSample,
} from "../lib/trading-signals/x-source-verification-core";
import { applyApprovedXOverlayToGeneratedDaily } from "../lib/trading-signals/x-opinion-overlay-core";

function sample(index: number, status: XSourceVerificationSample["status"]): XSourceVerificationSample {
  return {
    id: `s-${index}`,
    username: "BTCTW0",
    postId: `p-${index}`,
    symbol: "BTC",
    horizon: "MEDIUM",
    forecastDate: `2026-09-${String(index + 1).padStart(2, "0")}`,
    lockedDirection: "LONG",
    lockedConfidence: 70,
    lockedAt: "2026-08-27T00:00:00.000Z",
    postedAt: "2026-08-26T00:00:00.000Z",
    status,
    actualDirection: status === "HIT" ? "UP" : status === "PARTIAL" ? "FLAT" : status === "MISS" ? "DOWN" : null,
    actualReturnPct: null,
    score: status === "HIT" ? 1 : status === "PARTIAL" ? 0.5 : status === "MISS" ? 0 : null,
    scoreVersion: "X_SOURCE_DIRECTION_V1",
    verifiedAt: status === "PENDING" ? null : "2026-09-20T00:00:00.000Z",
  };
}

test("one opinion becomes one future-only sample per asset", () => {
  assert.equal(selectXVerificationDate({ targetDates: ["2026-08-27", "2026-08-28", "2026-08-29"], horizon: "SHORT", lockedDate: "2026-08-27" }), "2026-08-28");
  assert.equal(selectXVerificationDate({ targetDates: ["2026-08-27", "2026-08-28", "2026-08-29"], horizon: "MEDIUM", lockedDate: "2026-08-27" }), "2026-08-29");
  assert.equal(selectXVerificationDate({ targetDates: ["2026-08-26", "2026-08-27"], horizon: "LONG", lockedDate: "2026-08-27" }), null);
  assert.equal(isXSourceVerifiableSymbol("SHCOMP"), true);
  assert.equal(isXSourceVerifiableSymbol("SOL"), false);
  assert.equal(canonicalXSourceActualSymbol("SSEC"), "SHCOMP");
  assert.equal(canonicalXSourceActualSymbol("000001.SS"), "SHCOMP");
});

test("direction verification keeps partial hits separate", () => {
  assert.deepEqual(scoreXSourceDirection("LONG", "UP"), { status: "HIT", score: 1 });
  assert.deepEqual(scoreXSourceDirection("SHORT", "DOWN"), { status: "HIT", score: 1 });
  assert.deepEqual(scoreXSourceDirection("LONG", "FLAT"), { status: "PARTIAL", score: 0.5 });
  assert.deepEqual(scoreXSourceDirection("LONG", "DOWN"), { status: "MISS", score: 0 });
});

test("promotion is source, asset and horizon specific and needs ten completed samples", () => {
  const ninePerfect = buildXSourceVerificationStats(Array.from({ length: 9 }, (_, index) => sample(index, "HIT")));
  const nine = ninePerfect.find((row) => row.symbol === "BTC" && row.horizon === "MEDIUM");
  assert.equal(nine?.promotionWeightPct, 0);
  assert.equal(nine?.maturity, "BUILDING");

  const mature = buildXSourceVerificationStats([
    ...Array.from({ length: 7 }, (_, index) => sample(index, "HIT")),
    sample(7, "PARTIAL"),
    sample(8, "PARTIAL"),
    sample(9, "MISS"),
  ]).find((row) => row.symbol === "BTC" && row.horizon === "MEDIUM");
  assert.equal(mature?.sampleCount, 10);
  assert.equal(mature?.weightedHitRatePct, 80);
  assert.equal(mature?.promotionWeightPct, 3);
  assert.equal(mature?.maturity, "VERIFIED");

  const obsolete = buildXSourceVerificationStats([
    ...Array.from({ length: 10 }, (_, index) => ({ ...sample(index, "HIT"), scoreVersion: "OBSOLETE_RULE" })),
  ]);
  assert.equal(obsolete.length, 0);
});

test("external verification changes scenarios and risk, never the locked direction", () => {
  const record = {
    id: "g-1",
    marketCode: "BTC",
    forecastDate: "2026-09-08",
    sourceWeeklyForecastId: "w-1",
    direction: "下跌",
    upProbability: 39,
    sidewaysProbability: 20,
    downProbability: 41,
    expectedPath: "震荡下跌",
    supportLevels: [],
    resistanceLevels: [],
    catalysts: [],
    risks: [],
    version: 1,
    status: "LOCKED",
    generatedAt: "2026-09-07T00:00:00.000Z",
  } as Parameters<typeof applyApprovedXOverlayToGeneratedDaily>[0];
  const result = applyApprovedXOverlayToGeneratedDaily(record, {
    symbol: "BTC",
    direction: "LONG",
    approvedCount: 2,
    totalWeightPct: 6,
    probabilityShiftPct: 6,
    summaries: [],
    displaySummaries: ["江恩跨市场分析师：9月8日偏多", "低风险策略分析师：结构转强"],
    levels: [],
    timeWindows: ["9月8日"],
    displayAllowedCount: 2,
    verifiedSourceCount: 2,
    buildingSourceCount: 0,
  });
  assert.equal(result.direction, "下跌");
  assert.equal(result.upProbability + result.sidewaysProbability + result.downProbability, 100);
  assert.ok(result.downProbability > result.upProbability);
  assert.ok(result.downProbability - result.upProbability <= record.downProbability - record.upProbability);
  assert.match(result.newsEvidence ?? "", /与MOOX相反/);
  assert.ok(result.risks?.some((row) => row.includes("等待价格确认")));
});

test("Tier-1 promotion is automatic, anonymous and migration-backed", () => {
  const read = (file: string) => readFileSync(resolve(file), "utf8");
  const registry = read("lib/trading-signals/x-source-registry.server.ts");
  const matrix = read("lib/trading-signals/x-opinion-matrix.ts");
  const verificationServer = read("lib/trading-signals/x-source-verification.server.ts");
  const dataStore = read("lib/data/moonx-data-store.ts");
  const cron = read("lib/automation/content-freshness.ts");
  const memberDaily = read("app/member/daily/page.tsx");
  const memberFeed = read("app/member/alpha-feed/page.tsx");
  const migration = read("prisma/migrations/20260827050000_x_source_verification_v1/migration.sql");

  assert.match(registry, /handle: "BTCTW0"[^\n]+verifiedPromotionEligible: true/);
  assert.match(registry, /handle: "formnoshape"[^\n]+verifiedPromotionEligible: true/);
  assert.equal((registry.match(/verifiedPromotionEligible: true/g) ?? []).length, 2);
  assert.match(matrix, /AUTO_TIER1_TRACKING_V1/);
  assert.match(matrix, /posted_at >= NOW\(\) - INTERVAL '36 hours'/);
  assert.match(matrix, /LIMIT 80/);
  assert.match(matrix, /jsonb_to_recordset/);
  assert.doesNotMatch(matrix, /lockedAt: iso\(approvalRows/);
  assert.match(matrix, /sourceStats\?\.promotionWeightPct \?\? 0/);
  assert.match(matrix, /Math\.min\(1, Math\.max\(0/);
  assert.ok(cron.indexOf("refreshExternalAnalystSignals") < cron.indexOf("autoApprovePriorityXOpinions"));
  assert.match(cron, /refresh\.errors\.length === 0 && tier1\.errors\.length === 0/);
  assert.match(cron, /repairs\.some\(\(item\) => !item\.ok\)\) after\.status = "ATTENTION"/);
  assert.match(verificationServer, /WHERE score_version = \$1/);
  assert.match(verificationServer, /LIMIT 200/);
  assert.match(verificationServer, /JOIN jsonb_to_recordset\(\$3::jsonb\) AS actual_keys/);
  assert.match(verificationServer, /verification\.forecast_date = actual_keys\.forecast_date::date/);
  assert.match(verificationServer, /listDailyVerificationResultsStrict/);
  assert.match(verificationServer, /NOT EXISTS/);
  assert.match(dataStore, /export async function listDailyVerificationResultsStrict/);
  assert.match(dataStore, /DAILY_VERIFICATION_STORAGE_UNAVAILABLE/);
  assert.match(dataStore, /SUPABASE_ADMIN_UNAVAILABLE/);
  assert.match(verificationServer, /UPDATE trade_external_analyst_verifications AS target/);
  assert.match(verificationServer, /target\.status = 'PENDING'/);
  assert.ok(cron.lastIndexOf("runDailyVerification") < cron.lastIndexOf("verifyPendingXSourceSamples"));
  assert.match(memberDaily, /外部验证同向/);
  assert.match(memberDaily, /外部验证相反/);
  assert.doesNotMatch(`${memberDaily}\n${memberFeed}`, /BTCTW0|formnoshape/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS trade_external_analyst_verifications/);
  assert.match(migration, /UNIQUE INDEX IF NOT EXISTS trade_external_analyst_verifications_source_sample_uq/);
  assert.match(migration, /ON trade_external_analyst_verifications\(username, post_id, symbol\);/);
  assert.doesNotMatch(migration, /username, post_id, symbol, forecast_date/);
});
