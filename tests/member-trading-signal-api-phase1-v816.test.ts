import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { buildMemberTradingPlan } from "../lib/trading-signals/member-trading-plan-core";
import type { AiTradePlan } from "../types/ai-trade-plan";
import type { ChanMultiTimeframeDecision, ChanStage } from "../types/chan-execution";

const now = "2026-08-15T12:00:00.000Z";
const instrument = { assetId: "btc", canonicalSymbol: "BTCUSDT", displayName: "比特币", assetClass: "CRYPTO" as const, bitgetSymbol: "BTCUSDT", availability: "AVAILABLE" as const, executionScope: "PAPER_LOCAL" as const, discoveredAt: now };
const methodology = { selected: "LIUYAO_CHAN", conditions: [{ key: "hexagram", label: "六爻周卦", value: "正式锁定方向", met: true }] };

function build(input: Parameters<typeof buildMemberTradingPlan>[0]) {
  return buildMemberTradingPlan({ ...input, methodology });
}

function sourcePlan(patch: Partial<AiTradePlan> = {}): AiTradePlan {
  return {
    id: "plan-1", planGroupId: "group-1", version: 2, contentHash: "content-hash-2",
    strategyType: "SWING", strategyLabel: "波段", symbol: "BTCUSDT", direction: "LONG",
    tier: "FORMAL", status: "WATCHING", executionMode: "BITGET_DEMO",
    thesisSummary: "正式计划", planningConfidence: 80, executionThreshold: 70,
    entryZoneLow: 67000, entryZoneHigh: 67500, triggerRule: "四小时确认后入场",
    confirmationTimeframe: "4H", orderTypeIfTriggered: "PAPER_ONLY", protectiveStop: 66000,
    target1: 69000, target2: 71000, target3: 74000, riskPercent: 2, maxLeverage: 3,
    validFrom: "2026-08-11T00:00:00.000Z", expiresAt: "2026-08-17T23:59:59.000Z",
    invalidationRule: "跌破66000失效", cancelIf: "正式方向反转", conditionsMet: 4, conditionsTotal: 4,
    currentPrice: 67200, distanceToEntryPct: 0, publishedAt: "2026-08-10T01:00:00.000Z",
    lastCheckedAt: now, submittedAt: null, firstFillAt: null, averageFillPrice: null,
    closedAt: null, closeReason: null, clientOid: null, bitgetOrderId: null, sourceDecisionId: "decision-1",
    forecastId: "forecast-1", forecastVersion: "forecast-1:v2", forecastHorizon: "WEEK",
    forecastPublishedAt: "2026-08-10T00:00:00.000Z", forecastLockedAt: "2026-08-10T00:00:00.000Z",
    forecastValidFrom: "2026-08-11T00:00:00.000Z", forecastValidUntil: "2026-08-17T23:59:59.000Z",
    forecastSource: "FORMAL_WEEKLY", createdAt: "2026-08-10T00:00:00.000Z", updatedAt: now, events: [],
    ...patch,
  };
}

function stage(timeframe: "30m" | "1H" | "4H" | "1D", direction: "BULL" | "BEAR"): ChanMultiTimeframeDecision["timeframeSignals"][number] {
  const bull = direction === "BULL";
  const value: ChanStage = {
    code: bull ? "SECOND_BUY_CONFIRMED" : "SECOND_SELL_CONFIRMED",
    labelZh: bull ? "二买已确认" : "二卖已确认",
    labelEn: bull ? "Second buy confirmed" : "Second sell confirmed",
    status: "ACTIVE", direction, confirmation: bull ? 67600 : 66400,
    invalidation: bull ? 66000 : 68000, action: bull ? "BUY_CANDIDATE" : "SELL_CANDIDATE", waitingFor: "已确认",
  };
  return { timeframe, signal: direction, complete: true, available: true, stage: value };
}

function chan(direction: "BULL" | "BEAR", patch: Partial<ChanMultiTimeframeDecision> = {}): ChanMultiTimeframeDecision {
  return {
    action: direction === "BULL" ? "BUY_CANDIDATE" : "SELL_CANDIDATE",
    authoritativeDirection: direction, reasons: [], technicalBias: direction,
    chanWeight: 35, chanContribution: 35, confirmation: direction === "BULL" ? 67600 : 66400,
    invalidation: direction === "BULL" ? 66000 : 68000,
    timeframeSignals: (["30m", "1H", "4H", "1D"] as const).map((value) => stage(value, direction)),
    executionAuthority: "RESEARCH_ONLY", tradingEligible: false,
    ...patch,
  };
}

test("locked formal direction plus aligned complete Chan becomes paper-only LONG_READY", () => {
  const result = build({ plan: sourcePlan({ status: "ARMED" }), chan: chan("BULL"), currentPrice: 67200, generatedAt: now, instrument });
  assert.equal(result.state, "LONG_READY");
  assert.equal(result.authority.valid, true);
  assert.equal(result.risk.tradingEligible, true);
  assert.equal(result.risk.paperOnly, true);
  assert.equal(result.risk.riskPerTradePct, 1);
  assert.equal(result.risk.maxPositionPct, 5);
  assert.equal(result.risk.leverageCap, 1);
  assert.equal(result.evidence.researchOnlyExcluded, true);
  assert.deepEqual(result.execution.takeProfits, [69000, 71000, 74000]);
});

test("missing lock fails closed and Chan conflict always waits", () => {
  const unlocked = build({
    plan: sourcePlan({ forecastLockedAt: null }), chan: chan("BULL"), currentPrice: 67200, generatedAt: now, instrument,
  });
  assert.equal(unlocked.state, "NO_AUTHORITY");
  assert.equal(unlocked.risk.tradingEligible, false);
  const conflict = build({
    plan: sourcePlan(),
    chan: chan("BEAR", { authoritativeDirection: "BULL", reasons: ["STRUCTURE_OPPOSES_AUTHORITY"] }),
    currentPrice: 67200,
    generatedAt: now, instrument,
  });
  assert.equal(conflict.state, "CONFLICT_WAIT");
  assert.equal(conflict.risk.tradingEligible, false);
});

test("candidate or merely watching source can never become Paper-ready", () => {
  const candidate = build({
    plan: sourcePlan({ tier: "CANDIDATE", status: "ARMED" }), chan: chan("BULL"), currentPrice: 67200, generatedAt: now, instrument,
  });
  assert.equal(candidate.state, "NO_AUTHORITY");
  assert.equal(candidate.risk.tradingEligible, false);
  const watching = build({
    plan: sourcePlan({ status: "WATCHING" }), chan: chan("BULL"), currentPrice: 67200, generatedAt: now, instrument,
  });
  assert.equal(watching.state, "WAIT_CONFIRMATION");
  assert.equal(watching.risk.tradingEligible, false);
  const partial = build({
    plan: sourcePlan({ status: "ARMED", conditionsMet: 3, conditionsTotal: 4 }), chan: chan("BULL"), currentPrice: 67200, generatedAt: now, instrument,
  });
  assert.equal(partial.state, "WAIT_CONFIRMATION");
});

test("NO_AUTHORITY and invalid level geometry never serialize stale stop or targets", () => {
  const noAuthority = build({ plan: sourcePlan({ forecastLockedAt: null }), chan: chan("BULL"), currentPrice: 62986.9, generatedAt: now, instrument });
  assert.equal(noAuthority.execution.levelStatus, "HIDDEN_NO_AUTHORITY");
  assert.equal(noAuthority.execution.stopLoss, null);
  assert.equal(noAuthority.execution.takeProfits, null);
  const invalid = build({ plan: sourcePlan({ status: "ARMED", protectiveStop: 64387, target1: 65000, target2: 66000, target3: 67000 }), chan: chan("BULL"), currentPrice: 62986.9, generatedAt: now, instrument });
  assert.equal(invalid.state, "INVALID_LEVEL_GEOMETRY");
  assert.equal(invalid.execution.levelStatus, "INVALID_LEVEL_GEOMETRY");
  assert.equal(invalid.execution.stopLoss, null);
  assert.equal(invalid.execution.takeProfits, null);
  assert.equal(invalid.risk.tradingEligible, false);
});

test("core geometry binds the whole entry zone for LONG and SHORT", () => {
  const invaded = build({ plan: sourcePlan({ status: "ARMED", protectiveStop: 67100 }), chan: chan("BULL"), currentPrice: 67200, generatedAt: now, instrument });
  assert.equal(invaded.state, "INVALID_LEVEL_GEOMETRY");
  const reversed = build({ plan: sourcePlan({ status: "ARMED", entryZoneLow: 67500, entryZoneHigh: 67000 }), chan: chan("BULL"), currentPrice: 67200, generatedAt: now, instrument });
  assert.equal(reversed.state, "INVALID_LEVEL_GEOMETRY");
  const shortPlan = sourcePlan({ status: "ARMED", direction: "SHORT", entryZoneLow: 66800, entryZoneHigh: 67200, protectiveStop: 68000, target1: 66000, target2: 65000, target3: 64000 });
  const shortResult = build({ plan: shortPlan, chan: chan("BEAR"), currentPrice: 67000, generatedAt: now, instrument });
  assert.equal(shortResult.state, "SHORT_READY");
});

test("member APIs gate before dynamic data modules and expose paper-only headers", () => {
  const plans = readFileSync("app/api/v1/member/trading/plans/current/route.ts", "utf8");
  const paper = readFileSync("app/api/v1/member/trading/paper/route.ts", "utf8");
  for (const source of [plans, paper]) {
    assert.match(source, /getMemberDevicePageAccess/);
    assert.match(source, /checkMemberApiRateLimit/);
    assert.match(source, /X-MOOX-Execution-Scope/);
    assert.match(source, /paper-only/);
    assert.doesNotMatch(source, /lib\/bitget|prediction-auto-trader|apiKey|secret|passphrase/i);
  }
  assert.ok(plans.indexOf("getMemberDevicePageAccess()") < plans.indexOf("import(\"@/lib/trading-signals/member-trading-plan.server\")"));
  assert.ok(paper.indexOf("authorize()") < paper.indexOf("import(\"@/lib/trading-signals/member-paper-store\")"));
});

test("migration isolates member ledgers and requires immutable idempotent audit", () => {
  const sql = readFileSync("prisma/migrations/20260815190000_member_signal_api_paper/migration.sql", "utf8");
  for (const token of [
    "member_paper_accounts", "user_id TEXT NOT NULL UNIQUE", "member_paper_positions",
    "UNIQUE (user_id, source_plan_id, source_plan_version)", "member_paper_events",
    "UNIQUE (user_id, idempotency_key)", "request_fingerprint TEXT NOT NULL",
    "member_signal_api_tokens", "token_hash TEXT NOT NULL UNIQUE", "scopes TEXT[]",
    "ENABLE ROW LEVEL SECURITY", "never exchange or live funds",
  ]) assert.ok(sql.includes(token), token);
  assert.doesNotMatch(sql, /trade_paper_accounts|trade_paper_positions|bitget|withdraw|passphrase/i);
});

test("paper store caps risk from the signed plan and never imports live execution", () => {
  const source = readFileSync("lib/trading-signals/member-paper-store.ts", "utf8");
  const loader = readFileSync("lib/trading-signals/member-trading-plan.server.ts", "utf8");
  assert.match(source, /riskPerTradePct/);
  assert.match(source, /maxPositionPct/);
  assert.match(source, /idempotency_key/);
  assert.match(source, /buildMemberPaperRequestFingerprint/);
  assert.match(source, /幂等键已用于不同操作或计划/);
  assert.match(source, /\$transaction/);
  assert.match(source, /changed !== 1/);
  assert.match(source, /FOR UPDATE/);
  assert.match(source, /openRisk/);
  assert.match(source, /remainingNotional/);
  assert.match(source, /markMemberPaperPositions/);
  assert.match(source, /max_drawdown_pct/);
  assert.doesNotMatch(source, /lib\/bitget|prediction-auto-trader|paptrading|withdraw|apiKey|passphrase/i);
  assert.match(loader, /2 \* 60 \* 60_000/);
  assert.match(loader, /const currentPrice = latestCandle/);
});

test("Paper retry binds an expected revision before reading current plan and EXIT is plan-independent", () => {
  const route = readFileSync("app/api/v1/member/trading/paper/route.ts", "utf8");
  for (const token of ["expectedPlanId", "expectedPlanVersion", "expectedRevisionId", "positionId", "getMemberPaperIdempotentResult", "loadFreshMemberMarketPrice"]) {
    assert.ok(route.includes(token), token);
  }
  const post = route.slice(route.indexOf("export async function POST"));
  const get = route.slice(route.indexOf("export async function GET"), route.indexOf("export async function POST"));
  assert.match(get, /loadFreshMemberMarketPrice/);
  assert.doesNotMatch(get, /loadCurrentMemberTradingPlan/);
  assert.ok(post.indexOf("getMemberPaperIdempotentResult") < post.indexOf("loadCurrentMemberTradingPlan"));
  assert.match(post, /} else {\s+const price = await planModule\.loadFreshMemberMarketPrice/);
});

test("member Signal API tokens are hashed scoped expiring revocable and membership-bound", () => {
  const auth = readFileSync("lib/auth/member-signal-api-token.ts", "utf8");
  const route = readFileSync("app/api/v1/member/trading/api-keys/route.ts", "utf8");
  const plans = readFileSync("app/api/v1/member/trading/plans/current/route.ts", "utf8");
  for (const token of ["createHash(\"sha256\")", "plans:read", "expires_at > NOW()", "getMembershipStatus", "last_used_at", "revokeMemberSignalApiToken"]) {
    assert.ok(auth.includes(token), token);
  }
  assert.match(route, /getMemberDevicePageAccess/);
  assert.match(route, /Token仅显示这一次/);
  assert.match(route, /export async function DELETE/);
  assert.match(plans, /verifyMemberSignalApiToken/);
  assert.match(plans, /member-signal-token:/);
  assert.doesNotMatch(auth, /lib\/bitget|withdraw|passphrase|exchange/i);
});
