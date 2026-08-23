import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { evaluateMarketSessionExposureSafety } from "../lib/trading-signals/market-session-exposure-core";

test("traditional mapped markets block new weekend exposure while crypto and risk reduction remain available", () => {
  const saturdayBeijing = Date.parse("2026-08-22T12:00:00+08:00");
  const sundayBeijing = Date.parse("2026-08-23T12:00:00+08:00");
  const mondayBeijing = Date.parse("2026-08-24T12:00:00+08:00");

  for (const symbol of ["BTCUSDT", "ETHUSDT", "HYPEUSDT"]) {
    assert.equal(evaluateMarketSessionExposureSafety({
      symbol,
      action: "NORMAL_PROFILE_ENTRY",
      nowMs: saturdayBeijing,
    }).allowed, true, `${symbol} Saturday`);
    assert.equal(evaluateMarketSessionExposureSafety({
      symbol,
      action: "SCALE_IN",
      nowMs: sundayBeijing,
    }).allowed, true, `${symbol} Sunday`);
  }

  for (const symbol of [
    "MUUSDT", "QQQUSDT", "XAUTUSDT", "XAGUSDT", "GOOGLUSDT",
    "CLUSDT", "SPYUSDT", "SNDKUSDT", "MSFTUSDT",
  ]) {
    for (const nowMs of [saturdayBeijing, sundayBeijing]) {
      for (const action of ["NORMAL_PROFILE_ENTRY", "SCALE_IN"] as const) {
        const blocked = evaluateMarketSessionExposureSafety({ symbol, action, nowMs });
        assert.equal(blocked.allowed, false, `${symbol} ${action} ${new Date(nowMs).toISOString()}`);
        assert.equal(blocked.rejectionCode, "MARKET_SESSION_CLOSED");
      }
    }
    assert.equal(evaluateMarketSessionExposureSafety({
      symbol,
      action: "SCALE_IN",
      nowMs: mondayBeijing,
    }).allowed, true, `${symbol} Monday`);
  }

  assert.equal(evaluateMarketSessionExposureSafety({
    symbol: "CLUSDT",
    action: "RISK_REDUCTION",
    nowMs: sundayBeijing,
  }).allowed, true);
});

test("Beijing weekend boundaries, symbol normalization, unknown markets and invalid clocks fail closed", () => {
  const cases = [
    ["2026-08-21T23:59:59.999+08:00", true],
    ["2026-08-22T00:00:00.000+08:00", false],
    ["2026-08-23T23:59:59.999+08:00", false],
    ["2026-08-24T00:00:00.000+08:00", true],
  ] as const;
  for (const [time, allowed] of cases) {
    assert.equal(evaluateMarketSessionExposureSafety({
      symbol: "  clusdt  ",
      action: "NORMAL_PROFILE_ENTRY",
      nowMs: Date.parse(time),
    }).allowed, allowed, time);
  }

  const unknown = evaluateMarketSessionExposureSafety({
    symbol: "NEWCOINUSDT",
    action: "NORMAL_PROFILE_ENTRY",
    nowMs: Date.parse("2026-08-24T12:00:00+08:00"),
  });
  assert.equal(unknown.allowed, false);
  assert.equal(unknown.rejectionCode, "MARKET_SESSION_CLASSIFICATION_REQUIRED");

  for (const nowMs of [Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_VALUE]) {
    for (const symbol of ["BTCUSDT", "CLUSDT", "NEWCOINUSDT"]) {
      const invalidTime = evaluateMarketSessionExposureSafety({
        symbol,
        action: "NORMAL_PROFILE_ENTRY",
        nowMs,
      });
      assert.equal(invalidTime.allowed, false, `${symbol} ${nowMs}`);
      assert.equal(invalidTime.rejectionCode, "MARKET_SESSION_TIME_INVALID");
      assert.equal(evaluateMarketSessionExposureSafety({
        symbol,
        action: "RISK_REDUCTION",
        nowMs,
      }).allowed, true, `${symbol} risk reduction ${nowMs}`);
    }
  }
});

test("weekend session guard runs before both normal entries and scale-in orders without bypassing exits", () => {
  const source = fs.readFileSync(path.join(process.cwd(), "lib/trading-signals/three-horizon-strategy.ts"), "utf8");
  const executeStart = source.indexOf("async function executeReadyDecision");
  const executeEnd = source.indexOf("export async function runThreeHorizonStrategyEngine", executeStart);
  const executeReady = source.slice(executeStart, executeEnd);
  assert.ok(executeReady.indexOf("evaluateMarketSessionExposureSafety({") >= 0);
  assert.ok(executeReady.indexOf("evaluateMarketSessionExposureSafety({") < executeReady.indexOf("placeBitgetDemoMarketOrder({"));

  const scaleStart = source.indexOf("// V6.4 staged entry");
  const scaleEnd = source.indexOf("const maxHoldingReached", scaleStart);
  const scaleIn = source.slice(scaleStart, scaleEnd);
  assert.ok(scaleIn.indexOf("evaluateMarketSessionExposureSafety({") >= 0);
  assert.ok(scaleIn.indexOf("evaluateMarketSessionExposureSafety({") < scaleIn.indexOf("placeBitgetDemoMarketOrder({"));
  assert.doesNotMatch(scaleIn, /marketSessionGate\.allowed[\s\S]{0,300}continue;/);

  const managementAfterScaleIn = source.slice(scaleEnd, source.indexOf("async function executeReadyDecision", scaleEnd));
  assert.match(managementAfterScaleIn, /hardIntradayExit/);
  assert.match(managementAfterScaleIn, /closePosition/);
  assert.match(managementAfterScaleIn, /runTp1ProtectionTransition/);
});
