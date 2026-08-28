import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  buildLiveTradingDiagnostics,
  type LiveDiagnosticDecisionRow,
  type LiveDiagnosticPlanRow,
} from "../lib/bitget/live-admin-diagnostics-core";

const ALLOWED = [
  "BTCUSDT", "ETHUSDT", "HYPEUSDT", "SOLUSDT", "MUUSDT", "NBISUSDT",
  "QQQUSDT", "XAUTUSDT", "XAGUSDT", "GOOGLUSDT", "CLUSDT", "SPYUSDT",
  "SNDKUSDT", "MSFTUSDT", "TENCENTUSDT", "LITEUSDT", "TSLAUSDT", "INTCUSDT",
];

function plan(overrides: Partial<LiveDiagnosticPlanRow> = {}): LiveDiagnosticPlanRow {
  return {
    strategy_type: "INTRADAY",
    symbol: "BTCUSDT",
    direction: "LONG",
    plan_tier: "FORMAL",
    status: "ARMED",
    forecast_version: "btc-week-v1",
    forecast_published_at: "2026-08-27T00:00:00.000Z",
    forecast_locked_at: "2026-08-27T00:00:00.000Z",
    forecast_valid_from: "2026-08-27T00:00:00.000Z",
    forecast_valid_until: "2026-09-01T00:00:00.000Z",
    last_checked_at: "2026-08-28T01:00:00.000Z",
    updated_at: "2026-08-28T01:00:00.000Z",
    ...overrides,
  };
}

function decision(overrides: Partial<LiveDiagnosticDecisionRow> = {}): LiveDiagnosticDecisionRow {
  return {
    strategy_type: "INTRADAY",
    symbol: "BTCUSDT",
    status: "OBSERVING",
    direction: "NEUTRAL",
    rejection_code: "NO_DIRECTION",
    rejection_reason: "没有锁定正式方向",
    client_oid: null,
    bitget_order_id: null,
    created_at: "2026-08-28T01:00:00.000Z",
    updated_at: "2026-08-28T01:00:00.000Z",
    ...overrides,
  };
}

test("diagnostics only treats locked, unexpired FORMAL plans as direction authority", () => {
  const result = buildLiveTradingDiagnostics({
    allowedSymbols: ALLOWED,
    plans: [
      plan(),
      plan({ strategy_type: "SWING", direction: "SHORT", status: "CLOSED", forecast_version: "btc-week-v2" }),
      plan({ strategy_type: "POSITION", forecast_version: "btc-month-expired", forecast_valid_until: "2026-08-28T00:00:00.000Z" }),
      plan({ symbol: "ETHUSDT", forecast_version: "eth-unlocked", forecast_locked_at: null }),
      plan({ symbol: "HYPEUSDT", plan_tier: "CANDIDATE", forecast_version: "hype-candidate" }),
      plan({ symbol: "SOLUSDT", forecast_version: "sol-future-lock", forecast_locked_at: "2026-08-29T00:00:00.000Z" }),
      plan({ symbol: "MUUSDT", forecast_version: "mu-future-validity", forecast_valid_from: "2026-08-29T00:00:00.000Z" }),
    ],
    decisions: [
      decision(),
      decision({ symbol: "ETHUSDT", direction: "LONG", rejection_code: "", rejection_reason: "" }),
    ],
    activity: [
      { strategy_type: "ALL", scan_runs: 12, decisions: 30, symbols_evaluated: 18, order_decisions: 1 },
      { strategy_type: "INTRADAY", scan_runs: 12, decisions: 18, symbols_evaluated: 18, order_decisions: 1 },
      { strategy_type: "SWING", scan_runs: 4, decisions: 8, symbols_evaluated: 8, order_decisions: 0 },
      { strategy_type: "POSITION", scan_runs: 1, decisions: 4, symbols_evaluated: 4, order_decisions: 0 },
    ],
    blockers: [],
    now: new Date("2026-08-28T12:00:00.000Z"),
  });

  assert.equal(result.allowedSymbols, 18);
  assert.equal(result.scanRuns, 12);
  assert.equal(result.decisions, 30);
  assert.equal(result.symbolsWithFormalDirection, 1);
  assert.equal(result.formalDirectionSlots, 2);
  assert.equal(result.armedPlanSlots, 1);
  assert.equal(result.orderDecisions, 1);

  const btc = result.coverage.find((row) => row.symbol === "BTCUSDT");
  assert.ok(btc);
  assert.equal(btc.horizons[0].coverageState, "LONG");
  assert.equal(btc.horizons[0].armed, true);
  assert.equal(btc.horizons[1].coverageState, "SHORT");
  assert.equal(btc.horizons[1].armed, false, "a closed plan preserves direction evidence but is not armed");
  assert.equal(btc.horizons[2].coverageState, "EXPIRED");

  const eth = result.coverage.find((row) => row.symbol === "ETHUSDT");
  assert.equal(eth?.horizons[0].coverageState, "MISSING", "an AI decision cannot replace a locked forecast plan");
  assert.equal(result.coverage.find((row) => row.symbol === "SOLUSDT")?.horizons[0].coverageState, "PENDING");
  assert.equal(result.coverage.find((row) => row.symbol === "MUUSDT")?.horizons[0].coverageState, "PENDING");
});

test("diagnostics ranks true blockers and excludes activity labels", () => {
  const result = buildLiveTradingDiagnostics({
    allowedSymbols: ALLOWED,
    plans: [],
    decisions: [decision()],
    activity: [],
    blockers: [
      { rejection_code: "PROBE_ENTRY", occurrences: 99, symbols: ["BTCUSDT"], latest_at: "2026-08-28T02:00:00Z" },
      { rejection_code: "NO_DIRECTION", occurrences: "18", symbols: ["ETHUSDT", "BTCUSDT", "BTCUSDT"], latest_at: "2026-08-28T03:00:00Z" },
      { rejection_code: "TECHNICAL_SCORE_LOW", occurrences: 7, symbols: ["HYPEUSDT"], latest_at: "2026-08-28T04:00:00Z" },
      { rejection_code: "CUSTOM_RISK_GATE", occurrences: 3, symbols: ["SOLUSDT"], latest_at: null },
    ],
    now: new Date("2026-08-28T12:00:00.000Z"),
  });

  assert.deepEqual(result.blockers.map((row) => row.code), ["NO_DIRECTION", "TECHNICAL_SCORE_LOW", "CUSTOM_RISK_GATE"]);
  assert.equal(result.blockers[0].label, "缺少正式方向");
  assert.deepEqual(result.blockers[0].symbols, ["BTCUSDT", "ETHUSDT"]);
  assert.equal(result.blockers[2].label, "风险控制拦截");
});

test("only ARMED is counted as an armed entry plan", () => {
  const statuses = ["PUBLISHED", "WATCHING", "ARMED", "ORDER_SUBMITTED", "PARTIALLY_FILLED", "OPEN", "REDUCED", "CLOSED"];
  for (const status of statuses) {
    const result = buildLiveTradingDiagnostics({
      allowedSymbols: ["BTCUSDT"],
      plans: [plan({ status })],
      decisions: [],
      activity: [],
      blockers: [],
      now: new Date("2026-08-28T12:00:00.000Z"),
    });
    const horizon = result.coverage[0]?.horizons[0];
    assert.equal(horizon?.armed, status === "ARMED", `${status} must not be mislabeled as an armed entry plan`);
    assert.equal(result.armedPlanSlots, status === "ARMED" ? 1 : 0);
  }
});

test("admin status diagnostics remain authenticated and read-only", async () => {
  const route = await readFile(new URL("../app/api/admin/bitget-demo/status/route.ts", import.meta.url), "utf8");
  const snapshot = await readFile(new URL("../lib/bitget/live-admin-snapshot.ts", import.meta.url), "utf8");
  const client = await readFile(new URL("../components/admin/BitgetDemoClient.tsx", import.meta.url), "utf8");

  assert.match(route, /requireAdmin\(\)/);
  assert.match(route, /getBitgetLiveAdminSnapshot\(\)/);
  assert.match(snapshot, /WITH recent_live_decisions AS/);
  assert.match(snapshot, /mode = 'LIVE'/);
  assert.match(snapshot, /execution_mode = 'BITGET_LIVE'/);
  assert.doesNotMatch(snapshot, /\b(?:INSERT|UPDATE|DELETE)\s+(?:INTO\s+|FROM\s+)?trade_(?:three_horizon_decisions|ai_plans)/i);
  const fallbackStart = snapshot.indexOf("function fallbackDashboard");
  const fallbackEnd = snapshot.indexOf("function mapSnapshot");
  assert.ok(fallbackStart >= 0 && fallbackEnd > fallbackStart);
  const fallbackBody = snapshot.slice(fallbackStart, fallbackEnd);
  assert.doesNotMatch(fallbackBody, /buildLiveTradingDiagnostics|tradingDiagnostics/,
    "an unavailable database snapshot must not be represented as a real all-zero diagnostic");
  assert.match(client, /近24小时交易机会诊断/);
  assert.match(client, /18品种 × 3周期正式方向覆盖/);
  assert.match(client, /tradingDiagnostics \? \(/, "the card must stay hidden when diagnostics are unavailable");
  assert.doesNotMatch(client, /可执行计划|订单生命周期/);
});
