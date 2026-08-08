import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

test("focus playbook makes gold the next-week primary setup", () => {
  const source = read("lib/trading-signals/ai-trading-focus.ts");
  assert.match(source, /symbol:\s*"XAUTUSDT"/);
  assert.match(source, /weeklyLabel:\s*"震荡上涨 · 先跌后涨"/);
  assert.match(source, /8\/10 周一/);
  assert.match(source, /8\/12 周三/);
  assert.match(source, /countertrendPolicy:\s*"STRONG_ONLY"/);
  assert.match(source, /反向只做强共振/);
});

test("live universe is dynamic, includes approved stock perps, and remains inside the exchange allow-list", () => {
  const source = read("lib/trading-signals/three-horizon-strategy.ts");
  assert.match(source, /LIVE_DYNAMIC_UNIVERSE_LIMIT/);
  assert.match(source, /selectDynamicTradeUniverse/);
  assert.match(source, /environment\.liveAllowedSymbols/);
  assert.match(source, /dynamicLiveSymbols/);
  assert.match(source, /SNDKUSDT/);
  assert.match(source, /MSFTUSDT/);
  assert.match(source, /getContractConfig\(symbol\)/);
  assert.match(source, /contract\?\.available/);
  assert.doesNotMatch(source, /const LIVE_EXPERIMENT_SYMBOL_PATTERN = \/\^\(BTC\|ETH/);
});

test("weekly focus can feed the trading engine without bypassing technical confirmation", () => {
  const source = read("lib/trading-signals/three-horizon-strategy.ts");
  assert.match(source, /buildAiTradingFocusPredictionPlan/);
  assert.match(source, /getAiTradingExecutionFocus/);
  assert.match(source, /1H\/15m同向共振/);
  assert.match(source, /FOCUS_COUNTERTREND_PROBE/);
  assert.match(source, /riskScale:\s*Math\.min/);
  assert.match(source, /LIVE_ACTIVITY_TARGET/);
});

test("member board is focus-first and no longer hard-codes ten asset cards", () => {
  const board = read("components/trading/AiTradeIntentBoard.tsx");
  assert.match(board, /本周重点交易/);
  assert.match(board, /每日走势预案/);
  assert.match(board, /AI技术执行/);
  assert.match(board, /动态候选池 Top 10/);
  assert.match(board, /listAiTradingDisplayFocus/);
  assert.doesNotMatch(board, /const ASSETS = \[/);
});

test("AI desk keeps the main screen compact and folds secondary detail", () => {
  const client = read("components/member/AiTradingDeskClient.tsx");
  assert.match(client, /AI交易执行台/);
  assert.match(client, /每日目标：≥1个合格激活机会/);
  assert.match(client, /<details/);
  assert.match(client, /成绩与已结束交易/);
  assert.match(client, /系统与风控详情/);
  assert.match(client, /quotes:\s*\[\]/);
  assert.doesNotMatch(client, /const LIVE_ASSETS = \[/);
});


test("Bitget live allow-list unions the explicitly approved SNDK and MSFT stock perps", () => {
  const source = read("lib/bitget/demo-client.ts");
  assert.match(source, /USER_APPROVED_STOCK_PERP_SYMBOLS_V791/);
  assert.match(source, /"SNDKUSDT"/);
  assert.match(source, /"MSFTUSDT"/);
  assert.match(source, /MOOX_APPROVED_STOCK_PERPS_V791/);
  assert.match(source, /\.\.\.values, \.\.\.approvedStockPerps/);
  assert.match(source, /environment\.liveAllowedSymbols\.includes\(input\.symbol\)/);
});
