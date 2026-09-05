import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { inspectHoldingClock, isIntradayDayEndDue } from "../lib/trading-signals/holding-clock-core";

const openedAt = "2026-09-05T00:00:00Z";
const nowMs = Date.parse("2026-09-05T01:00:00Z");
const maxHoldingUntil = "2026-09-05T01:30:00Z";

test("persisted trading deadlines are enforced exactly and never rebased", () => {
  const input = { openedAt, maxHoldingUntil, nowMs };
  assert.deepEqual(inspectHoldingClock(input), { verified: true, deadlineReached: false, reason: "" });
  assert.equal(inspectHoldingClock({ ...input, nowMs: Date.parse(maxHoldingUntil) }).deadlineReached, true);
  assert.equal(inspectHoldingClock({ ...input, nowMs: Date.parse(maxHoldingUntil) - 1 }).deadlineReached, false);
  assert.deepEqual(input, { openedAt, maxHoldingUntil, nowMs });
  // Preserve a valid older deadline; do not silently migrate historical holdings.
  assert.equal(inspectHoldingClock({ ...input, maxHoldingUntil: "2026-09-12T01:30:00Z" }).verified, true);
});

test("unknown clocks block new exposure without inventing open or exit times", () => {
  for (const bad of [null, "", "bad", "2026-09-06T00:00:00Z"]) {
    const result = inspectHoldingClock({ openedAt: bad, maxHoldingUntil, nowMs });
    assert.equal(result.verified, false);
    assert.equal(result.deadlineReached, false);
    assert.ok(result.reason);
  }
  for (const bad of [null, "", "bad"]) {
    assert.equal(inspectHoldingClock({ openedAt, maxHoldingUntil: bad, nowMs }).verified, false);
    assert.equal(inspectHoldingClock({ openedAt, maxHoldingUntil: bad, nowMs }).deadlineReached, false);
  }
  for (const badNow of [NaN, Infinity, -Infinity, 1e20]) {
    assert.deepEqual(inspectHoldingClock({ openedAt, maxHoldingUntil, nowMs: badNow }), {
      verified: false, deadlineReached: false,
      reason: inspectHoldingClock({ openedAt: null, maxHoldingUntil, nowMs }).reason,
    });
  }
});

test("a known frozen expiry is still due when the opening timestamp was lost", () => {
  const result = inspectHoldingClock({ openedAt: null, maxHoldingUntil, nowMs: Date.parse(maxHoldingUntil) });
  assert.equal(result.verified, false);
  assert.equal(result.deadlineReached, true);
});

test("Beijing intraday end uses 23:45 and day rollover, never malformed or future timestamps", () => {
  const base = { strategyType: "INTRADAY", openedAt };
  assert.equal(isIntradayDayEndDue({ ...base, nowMs: Date.parse("2026-09-05T15:44:59Z") }), false);
  assert.equal(isIntradayDayEndDue({ ...base, nowMs: Date.parse("2026-09-05T15:45:00Z") }), true);
  assert.equal(isIntradayDayEndDue({ ...base, nowMs: Date.parse("2026-09-05T16:00:00Z") }), true);
  for (const strategyType of ["SWING", "POSITION"]) assert.equal(isIntradayDayEndDue({ ...base, strategyType, nowMs: Date.parse("2026-09-05T16:00:00Z") }), false);
  for (const bad of [null, "bad", "2026-09-06T00:00:00Z"]) assert.equal(isIntradayDayEndDue({ ...base, openedAt: bad, nowMs }), false);
  for (const badNow of [NaN, Infinity, 8.64e15]) assert.equal(isIntradayDayEndDue({ ...base, nowMs: badNow }), false);
});

test("engine keeps managing protection and exits but propagates clock errors to entry gates", () => {
  const source = readFileSync("lib/trading-signals/three-horizon-strategy.ts", "utf8");
  assert.doesNotMatch(source, /decisionForManagement\.openedAt\) : now/);
  assert.match(source, /\.\.\.\(openedAt \? \{ openedAt \} : \{\}\)/);
  const guard = source.slice(source.indexOf("if (!holdingClock.verified)"), source.indexOf("// V6.4 staged entry"));
  assert.match(guard, /orderErrors \+= 1/);
  assert.match(guard, /HOLDING_CLOCK_UNVERIFIED/);
  assert.doesNotMatch(guard, /continue;|status: "ERROR"|maxHoldingUntil:/);
  assert.match(source, /holdingClock.verified && scaleInAuthority.allowed/);
  assert.match(source, /const maxHoldingReached = holdingClock.deadlineReached/);
  assert.match(source, /let entrySafetyStop = commissioningError \|\| scaleInManagementError \|\| management.orderErrors > 0/);
  assert.match(source, /current.status === "CLOSING" \|\| ultraShortTimeExit\?\.shouldExit \|\| maxHoldingReached/);
});

test("real management loop keeps protection and reaches the next due position after a bad clock", async () => {
  const now = new Date("2026-09-05T10:00:00Z");
  type Row = { id: string; symbol: string; direction: string; strategyType: string; status: string;
    openedAt: string | Date | null; maxHoldingUntil: string | null; createdAt: string;
    stopLoss: number; target1: number; target2: number; riskPct: number; rejectionCode?: string };
  const rows: Row[] = [
    { id: "bad-clock", symbol: "BTCUSDT", direction: "LONG", strategyType: "SWING", status: "OPEN", openedAt: null, maxHoldingUntil: null, createdAt: "2026-09-01T00:00:00Z", stopLoss: 10, target1: 100, target2: 20, riskPct: 0.1 },
    { id: "due-clock", symbol: "ETHUSDT", direction: "LONG", strategyType: "POSITION", status: "OPEN", openedAt: "2026-09-01T00:00:00Z", maxHoldingUntil: "2026-09-05T09:00:00Z", createdAt: "2026-09-01T00:00:00Z", stopLoss: 10, target1: 100, target2: 20, riskPct: 0.1 },
  ];
  const positions = rows.map((row) => ({ symbol: row.symbol, total: 1, markPrice: 15, avgPrice: 14, posSide: "long" }));
  const events: Array<{ kind: string; id?: string; symbol?: string }> = [];
  // No require, process, fetch, database or exchange adapter enters this VM.
  // Missing mocks fail with ReferenceError instead of falling through to live IO.
  const context = {
    Date, Number, Math, Map, Set, Promise, JSON, Error, inspectHoldingClock, isIntradayDayEndDue,
    CRYPTO_RISK_GROUP_SYMBOLS: new Set(),
    listActiveDecisionRows: async () => rows,
    mapDecision: (row: Row) => ({ ...row }),
    getBitgetDemoClosedPositions: async () => [],
    getBitgetDemoCurrentPositions: async () => positions,
    getBitgetDemoPendingStrategyOrders: async () => [],
    getThreeHorizonProfiles: async () => [],
    isExposureLedgerConsistent: () => true,
    getBitgetDemoEnvironment: () => ({}),
    matchingPosition: (items: typeof positions, decision: Row) => items.find((position) => position.symbol === decision.symbol),
    isManagedScaleInRecovery: () => false,
    updateDecision: async (id: string, patch: Partial<Row>) => {
      events.push({ kind: "update", id });
      const row = rows.find((item) => item.id === id)!;
      Object.assign(row, patch);
      return { ...row };
    },
    matchingProtection: () => null,
    placeBitgetDemoProtectionOrder: async (input: { symbol: string }) => {
      events.push({ kind: "protect", symbol: input.symbol });
      return { orderId: "p", clientOid: "pc" };
    },
    forecastDirectionForStrategy: () => null,
    positionContextEligibility: () => ({ allowed: false }),
    evaluateScaleInAuthority: () => ({ allowed: false }),
    hardIntradayExit: (decision: Row, at: Date) => isIntradayDayEndDue({
      strategyType: decision.strategyType, openedAt: typeof decision.openedAt === "string" ? decision.openedAt : null, nowMs: at.getTime(),
    }),
    evaluateUltraShortTimedExit: () => ({ shouldExit: false }),
    closePosition: async (decision: Row) => { events.push({ kind: "close", id: decision.id }); },
    shouldRunTp1ProtectionTransition: () => { events.push({ kind: "tp1-check" }); return false; },
    targetReached: () => false,
  };
  const source = readFileSync("lib/trading-signals/three-horizon-strategy.ts", "utf8");
  const start = source.indexOf("async function manageActiveDecisions(");
  const end = source.indexOf("function unifiedHorizonForStrategy(", start);
  assert.ok(start >= 0 && end > start);
  vm.runInNewContext(ts.transpileModule(source.slice(start, end), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText, context, { timeout: 1000 });
  const result = await (context as unknown as {
    manageActiveDecisions: (at: Date) => Promise<{ managed: number; orderErrors: number }>;
  }).manageActiveDecisions(now);
  assert.equal(result.managed, 2);
  assert.equal(result.orderErrors, 1);
  assert.equal(rows[0].openedAt, null);
  assert.equal(rows[0].maxHoldingUntil, null);
  assert.equal(rows[0].rejectionCode, "HOLDING_CLOCK_UNVERIFIED");
  assert.equal(events.filter((event) => event.kind === "protect").length, 2);
  assert.ok(events.some((event) => event.kind === "tp1-check"));
  assert.deepEqual(events.filter((event) => event.kind === "close").map((event) => event.id), ["due-clock"]);
});
