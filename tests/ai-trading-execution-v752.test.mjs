import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const strategy = fs.readFileSync('lib/trading-signals/three-horizon-strategy.ts', 'utf8');
const plans = fs.readFileSync('lib/trading-signals/ai-trade-plans.ts', 'utf8');

const has = (text, value) => text.includes(value);

test('preserves V6.4 live staged execution state', () => {
  assert.equal(has(strategy, 'tp1Done: Boolean(row.tp1_done)'), true);
  assert.equal(has(strategy, 'entryStage: Number(row.entry_stage ?? 0)'), true);
  assert.equal(has(strategy, 'maxEntryStages: Number(row.max_entry_stages ?? 2)'), true);
  assert.equal(has(strategy, 'scaleInOrderId: row.scale_in_order_id'), true);
  assert.equal(has(strategy, 'entryStage: 2'), true);
  assert.equal(has(strategy, 'scaleInOrderId: addOrder.orderId'), true);
});

test('preserves live mode and real-money gates', () => {
  assert.equal(has(strategy, 'MOOX_TRADING_CONTROL_MODE'), true);
  assert.equal(has(strategy, 'profile.mode !== "LIVE"'), true);
  assert.equal(has(plans, '"BITGET_LIVE"'), true);
  assert.equal(has(plans, 'profile.mode === "LIVE" ? "BITGET_LIVE" : "BITGET_DEMO"'), true);
});

test('MOOX direction is separated from market timing', () => {
  assert.equal(has(strategy, 'const mooxDirection = forecastDirection(plan);'), true);
  assert.equal(has(strategy, 'const direction = mooxDirection !== "NEUTRAL" ? mooxDirection : activeDirection.direction;'), true);
  assert.equal(has(strategy, 'const entryMet = exactCross || reclaimTrigger || continuationTrigger || pathTurnTrigger;'), true);
  assert.equal(has(strategy, 'plan?.setup === "BUY_DIP"'), true);
  assert.equal(has(strategy, 'plan?.setup === "SELL_RALLY"'), true);
});

test('public plan lead is short but still auditable', () => {
  assert.match(plans, /INTRADAY:\s*1,/);
  assert.match(plans, /SWING:\s*5,/);
  assert.match(plans, /POSITION:\s*15,/);
});

test('zero-trade funnel is observable', () => {
  assert.equal(has(strategy, '方向明确${directionalDecisions}，入场触发${entryTriggers}，事前发布时间拦截${leadTimeBlocks}，风险拦截${riskBlocks}'), true);
});

test('hard risk protections remain present', () => {
  for (const token of ['PROJECTED_OPEN_RISK_LIMIT', 'PROJECTED_CRYPTO_GROUP_LIMIT', 'PROTECTION_MISSING', 'DAILY_LOSS_LIMIT_PCT']) {
    assert.equal(has(strategy, token), true, token);
  }
});

test('legacy activity quota is opt-in/configured rather than forced by default', () => {
  assert.equal(has(strategy, '"MOOX_LIVE_ACTIVITY_TARGET_V641", 0, 0, 4'), true);
});
