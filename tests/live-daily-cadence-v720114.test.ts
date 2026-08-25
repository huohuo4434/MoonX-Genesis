import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const strategy = fs.readFileSync("lib/trading-signals/three-horizon-strategy.ts", "utf8");
const memberDesk = fs.readFileSync("components/member/AiTradingDeskClient.tsx", "utf8");

test("live short cadence targets one to five qualified orders without becoming a quota bypass", () => {
  assert.match(strategy, /const LIVE_ACTIVITY_CONTROL = readAuthoritativeTradingControlMode\(\)/);
  assert.match(strategy, /LIVE_ACTIVITY_CONTROL\.configured && LIVE_ACTIVITY_CONTROL\.mode === "LIVE"/);
  assert.match(strategy, /"MOOX_LIVE_ACTIVITY_TARGET_V641", 1, 1, 5/);
  assert.match(strategy, /isActivityPromotionEligible\(decision\)/);
  assert.match(strategy, /decision\.strategyType === "INTRADAY"/);
  assert.match(strategy, /decision\.direction === "LONG" \|\| decision\.direction === "SHORT"/);
  assert.match(strategy, /decision\.technicalScore >= 34/);
  assert.match(strategy, /condition\.key === "entry" && condition\.met/);
  assert.match(strategy, /decisionRewardRisk\(decision\) >= 1\.05/);
  assert.match(strategy, /!positions\.some\(\(row\) => row\.symbol === decision\.symbol && row\.total > 0\)/);
  assert.match(strategy, /!protections\.some\(\(row\) => row\.symbol === decision\.symbol\)/);
  assert.match(strategy, /riskPerTradePct: Math\.min\(baseProfile\.riskPerTradePct, LIVE_ACTIVITY_PROBE_RISK_PCT\)/);
  assert.match(strategy, /maxHoldingMinutes: Math\.min\(baseProfile\.maxHoldingMinutes, 180\)/);
  assert.match(strategy, /prepareAiTradePlanBeforeExecution/);
  assert.match(strategy, /executeReadyDecision/);
  assert.match(strategy, /PROJECTED_OPEN_RISK_LIMIT/);
  assert.match(strategy, /DAILY_LOSS_LIMIT_PCT/);
  assert.match(strategy, /const liveRiskBudgetPct = Math\.min\(unifiedSetting\.maxLossPercent, plannedRiskPct\)/);
  assert.match(strategy, /maxLossPercent: liveRiskBudgetPct/);
  assert.match(strategy, /riskPct > liveRiskBudgetPct/);
  assert.match(strategy, /let intradayExecutedToday = intradayProfile/);
  assert.match(strategy, /LIVE_ACTIVITY_TARGET - intradayExecutedToday/);
  assert.match(strategy, /intradayExecutedToday \+= 1/);
});

test("member desk explains the cadence and preserves visible hard blockers", () => {
  assert.match(memberDesk, /日目标1—5笔/);
  assert.match(memberDesk, /仍是硬闸门/);
  assert.match(memberDesk, /具体阻断原因/);
});
