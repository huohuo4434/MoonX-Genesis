import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const strategy = fs.readFileSync("lib/trading-signals/three-horizon-strategy.ts", "utf8");
const client = fs.readFileSync("lib/bitget/demo-client.ts", "utf8");
const packageJson = fs.readFileSync("package.json", "utf8");

test("mechanical trade-count quotas are removed without touching position or portfolio risk limits", () => {
  for (const obsolete of [
    "GLOBAL_DAILY_TRADE_CAP",
    "SYMBOL_DAILY_TRADE_CAP",
    "HORIZON_PERIOD_TRADE_CAP",
    "DAILY_TRADE_LIMIT",
  ]) assert.doesNotMatch(strategy, new RegExp(obsolete));

  for (const hardGate of [
    "UNIFIED_HORIZON_POSITION_CAP",
    "PROJECTED_OPEN_RISK_LIMIT",
    "PROJECTED_CRYPTO_GROUP_LIMIT",
    "UNIFIED_DAILY_LOSS_LIMIT",
    "UNIFIED_WEEKLY_LOSS_LIMIT",
    "PROTECTION_MISSING",
    "SYMBOL_RESERVED_THIS_RUN",
  ]) assert.match(strategy, new RegExp(hardGate));

  assert.doesNotMatch(client, /attempts >= environment\.liveMaxTradesPerDay/);
  assert.match(client, /positions\.length >= environment\.liveMaxConcurrentPositions/);
  assert.match(client, /currentGross \+ notional > grossLimit/);
});

test("same-symbol exposure is limited to a protected, same-direction staged add-on", () => {
  assert.match(strategy, /current\.maxEntryStages >= 2/);
  assert.match(strategy, /!current\.scaleInOrderId/);
  assert.match(strategy, /scaleInTechnicalTriggerFingerprint/);
  assert.match(strategy, /hasPositionSideProtectionCoverage/);
  assert.match(strategy, /existingNotional \+ addedNotional > liveSinglePositionLimit/);
  assert.match(strategy, /exposureAction: "SCALE_IN"/);
  assert.match(strategy, /technicalTriggerFingerprint/);
  assert.match(strategy, /maxEntryStages: 2/);

  assert.match(client, /input\.exposureAction === "SCALE_IN"/);
  assert.match(client, /分批加仓方向与既有/);
  assert.match(client, /分批加仓缺少新的技术触发指纹/);
  assert.match(client, /分批加仓触发指纹未绑定到幂等执行身份/);
  assert.match(client, /getBitgetDemoPendingStrategyOrders\(\)/);
  assert.match(client, /row\.tpslMode === "full"/);
  assert.match(client, /Number\(row\.stopLoss\) < existingPosition\.markPrice/);
  assert.match(client, /Number\(row\.takeProfit\) > existingPosition\.markPrice/);
  assert.match(client, /交易所侧全仓止盈止损未权威确认/);
  assert.match(client, /existingPositionNotional \+ notional > perPositionLimit/);
});

test("scale-in retains exchange protection and idempotent rollback behavior", () => {
  assert.match(strategy, /scale-in-2:\$\{technicalTriggerFingerprint\}/);
  assert.match(strategy, /getBitgetDemoPendingStrategyOrders\(\)/);
  assert.match(strategy, /第二批加仓后无法确认合并仓位保护/);
  assert.match(strategy, /reduceOnly: true/);
  assert.match(client, /idempotencyKey: `\$\{input\.reduceOnly \? "close" : "open"\}:\$\{oid\}`/);
  assert.match(client, /tpslMode: "full"/);
});

test("production wiring manages exits before the separately authorized scale-in phase", () => {
  const firstManagement = strategy.indexOf("manage: () => manageActiveDecisions(now)");
  const manageOnlyReturn = strategy.indexOf("if (options.manageOnly || Date.now() >= newEntryCutoffMs)");
  const canonicalForecast = strategy.indexOf("const canonicalForecastBySymbol = new Map");
  const scaleInPhase = strategy.indexOf("scaleInOnly: true");
  const commissioning = strategy.indexOf("const commissioning = await runLiveCommissioning");
  assert.ok(firstManagement >= 0 && firstManagement < manageOnlyReturn);
  assert.ok(manageOnlyReturn < canonicalForecast && canonicalForecast < scaleInPhase);
  assert.ok(scaleInPhase < commissioning);
  assert.match(strategy, /if \(options\.scaleInOnly\) continue;[\s\S]*const ultraShortTimeExit/);
  assert.match(strategy, /status='ERROR' AND rejection_code='SCALE_IN_PROTECTION_UNRESOLVED'/);
});

test("successful scale-in refreshes authoritative risk and account state before later exposure", () => {
  const scaleInPhase = strategy.indexOf("const scaleInManagement = await manageActiveDecisions");
  const refreshGate = strategy.indexOf("requiresAuthoritativeRiskRefresh(scaleInManagement.orderSuccess)");
  const authoritativeRefresh = strategy.indexOf("[risk, positions, protections] = await Promise.all");
  const commissioning = strategy.indexOf("const commissioning = await runLiveCommissioning");
  assert.ok(scaleInPhase >= 0 && scaleInPhase < refreshGate);
  assert.ok(refreshGate < authoritativeRefresh && authoritativeRefresh < commissioning);
  assert.match(strategy, /risk\.blocked \|\| !newExposureLedgerConsistent[\s\S]*scaleInManagementError = true/);
  assert.match(strategy, /runLiveCommissioning\(\{[\s\S]*risk,[\s\S]*positions,[\s\S]*protections/);
  assert.match(strategy, /executeReadyDecision\(\{[\s\S]*risk,[\s\S]*authorityReadsOk: forecastAuthorityReadsOk/);
});

test("unresolved scale-in has a dedicated recovery path and default test coverage", () => {
  assert.match(strategy, /evaluateUnresolvedScaleInRecovery\(\{/);
  assert.match(strategy, /hasFullPositionSideProtection: hasPositionSideProtectionCoverage/);
  assert.match(strategy, /scale-in-recovery-full-protection/);
  assert.match(strategy, /第二批仓位保护未解决，执行全仓紧急退出/);
  assert.match(packageJson, /tests\/live-scale-in-safety-core\.test\.ts/);
});
