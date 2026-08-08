import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const page = fs.readFileSync("app/member/alpha-feed/page.tsx", "utf8");
const environment = fs.readFileSync("lib/trading-signals/market-environment.ts", "utf8");
const overlay = fs.readFileSync("lib/trading-signals/x-intelligence-overlay.ts", "utf8");
const strategy = fs.readFileSync("lib/trading-signals/three-horizon-strategy.ts", "utf8");

test("member page is decision-oriented instead of a raw clue wall", () => {
  assert.match(page, /市场环境/);
  assert.match(page, /对次日预测的影响/);
  assert.match(page, /AI交易怎么用/);
  assert.match(page, /查看统计依据（高级）/);
  assert.doesNotMatch(page, /识别位置/);
  assert.doesNotMatch(page, /item\.keyLevels/);
  assert.doesNotMatch(page, /item\.timeWindows/);
  assert.doesNotMatch(page, /自动权重 \$\{/);
});

test("environment layer stays bounded and cannot become a standalone signal", () => {
  assert.match(environment, /buildMarketEnvironment/);
  assert.match(environment, /buildXIntelligenceTradeUniverseBoost/);
  assert.match(environment, /Overheated: lowers chase priority only/);
  assert.match(page, /不能单独反转主预测/);
  assert.match(page, /不能绕过风控/);
});

test("gold token XAUT is mapped into the gold forecast context", () => {
  assert.match(overlay, /XAUT/);
  assert.match(overlay, /XAUTUSDT/);
});

test("AI dynamic universe consumes market-environment boost only as ranking input", () => {
  assert.match(strategy, /MOOX_MARKET_ENVIRONMENT_V711/);
  assert.match(strategy, /getXIntelligenceSnapshot/);
  assert.match(strategy, /buildXIntelligenceTradeUniverseBoost/);
  assert.match(strategy, /xEnvironmentBoost/);
  assert.doesNotMatch(strategy, /xEnvironmentBoost[^\n]{0,80}ready\s*=/);
});
