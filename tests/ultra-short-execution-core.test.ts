import assert from "node:assert/strict";
import test from "node:test";
import {
  buildUltraShortPriceGeometry,
  conservativeNetRewardRisk,
  costAdjustedRiskPerUnit,
  evaluateUltraShortTimedExit,
  MIN_NET_REWARD_RISK,
  normalizeExecutionPriceGeometry,
  ULTRA_SHORT_MAX_HOLDING_MINUTES,
} from "../lib/trading-signals/ultra-short-execution-core";

test("超短线用5分钟ATR生成紧凑止损，并给手续费后盈亏比留出空间", () => {
  const long = buildUltraShortPriceGeometry({ direction: "LONG", entry: 100, atr5m: 0.2, swingLow5m: 99.8, swingHigh5m: 100.2 });
  assert.deepEqual(long, { stopLoss: 99.65, target1: 100.35, target2: 100.77, stopDistancePct: 0.35 });
  assert.ok(conservativeNetRewardRisk({ entryPrice: 100, stopLoss: long?.stopLoss, target: long?.target2 }) >= MIN_NET_REWARD_RISK);
  const short = buildUltraShortPriceGeometry({ direction: "SHORT", entry: 100, atr5m: 1, swingLow5m: 98.7, swingHigh5m: 101.3 });
  assert.deepEqual(short, { stopLoss: 101.35, target1: 98.65, target2: 97.03, stopDistancePct: 1.35 });
});

test("5分钟结构需要超过1.5%止损时拒绝，而不是把止损夹在结构内", () => {
  assert.equal(buildUltraShortPriceGeometry({ direction: "LONG", entry: 100, atr5m: 2, swingLow5m: 98, swingHigh5m: 102 }), null);
  assert.equal(buildUltraShortPriceGeometry({ direction: "SHORT", entry: 100, atr5m: 0.5, swingLow5m: 98, swingHigh5m: 102 }), null);
});

test("候选盈亏比扣除双边手续费与滑点", () => {
  assert.ok(conservativeNetRewardRisk({ entryPrice: 100, stopLoss: 99.65, target: 100.56 }) < MIN_NET_REWARD_RISK);
  assert.ok(conservativeNetRewardRisk({ entryPrice: 100, stopLoss: 99.65, target: 100.77 }) >= MIN_NET_REWARD_RISK);
});

const coarseContract = {
  symbol: "TESTUSDT",
  available: true,
  sizeMultiplier: 0.1,
  volumePlace: 1,
  priceMultiplier: 1,
  pricePrecision: 0,
};

test("LONG和SHORT在粗价格步长下按风险方向归一化", () => {
  const long = normalizeExecutionPriceGeometry({
    direction: "LONG", entryPrice: 100.4, stopLoss: 99.2, target1: 101.2, target2: 102.7,
    contract: coarseContract, maxStopDistancePct: 1.5,
  });
  assert.equal(long.ok, true);
  if (long.ok) assert.deepEqual(
    { entry: long.value.entryPrice, stop: long.value.stopLoss, t1: long.value.target1, t2: long.value.target2 },
    { entry: 100, stop: 99, t1: 102, t2: 103 },
  );
  const short = normalizeExecutionPriceGeometry({
    direction: "SHORT", entryPrice: 100.4, stopLoss: 100.8, target1: 99.2, target2: 98.1,
    contract: coarseContract, maxStopDistancePct: 1.5,
  });
  assert.equal(short.ok, true);
  if (short.ok) assert.deepEqual(
    { entry: short.value.entryPrice, stop: short.value.stopLoss, t1: short.value.target1, t2: short.value.target2 },
    { entry: 100, stop: 101, t1: 99, t2: 98 },
  );
});

test("归一化后几何失效、超过1.5%和净RR不足都失败关闭", () => {
  const invalid = normalizeExecutionPriceGeometry({
    direction: "LONG", entryPrice: 100, stopLoss: 99.2, target1: 100.1, target2: 100.2,
    contract: coarseContract,
  });
  assert.deepEqual(invalid.ok ? "" : invalid.code, "INVALID_GEOMETRY");
  const tooWide = normalizeExecutionPriceGeometry({
    direction: "LONG", entryPrice: 100, stopLoss: 98.49, target1: 101, target2: 103,
    contract: coarseContract, maxStopDistancePct: 1.5,
  });
  assert.deepEqual(tooWide.ok ? "" : tooWide.code, "STOP_TOO_WIDE");
  const lowRr = normalizeExecutionPriceGeometry({
    direction: "LONG", entryPrice: 100, stopLoss: 98.99, target1: 100.5, target2: 101.5,
    contract: coarseContract,
  });
  assert.deepEqual(lowRr.ok ? "" : lowRr.code, "NET_RR_TOO_LOW");
});

test("1.5%边界可通过，仓位风险按0.16%成本完整计入", () => {
  const halfStep = { ...coarseContract, priceMultiplier: 0.5, pricePrecision: 1 };
  const boundary = normalizeExecutionPriceGeometry({
    direction: "LONG", entryPrice: 100, stopLoss: 98.5, target1: 101.5, target2: 103.5,
    contract: halfStep, maxStopDistancePct: 1.5,
  });
  assert.equal(boundary.ok, true);
  const riskPerUnit = costAdjustedRiskPerUnit({ entryPrice: 100, stopLoss: 99.65 });
  assert.ok(Math.abs(riskPerUnit - 0.51) < 1e-9);
  const quantity = 2 / riskPerUnit;
  assert.ok(quantity * riskPerUnit <= 2 + 1e-9);
});

test("60分钟没有0.25R推进则退出，已有推进继续等待", () => {
  const base = { openedAt: "2026-08-26T00:00:00.000Z", now: "2026-08-26T01:00:00.000Z", direction: "LONG" as const, entryPrice: 100, stopLoss: 99, tp1Done: false };
  assert.equal(evaluateUltraShortTimedExit({ ...base, markPrice: 100.1 }).code, "ULTRA_SHORT_STALE_EXIT");
  assert.equal(evaluateUltraShortTimedExit({ ...base, markPrice: 100.3 }).shouldExit, false);
  assert.equal(evaluateUltraShortTimedExit({ ...base, direction: "SHORT", stopLoss: 101, markPrice: 99.7 }).shouldExit, false);
});

test("90分钟绝对退出优先于已完成TP1状态", () => {
  const result = evaluateUltraShortTimedExit({
    openedAt: "2026-08-26T00:00:00.000Z",
    now: `2026-08-26T01:${ULTRA_SHORT_MAX_HOLDING_MINUTES - 60}:00.000Z`,
    maxHoldingUntil: "2026-08-26T01:30:00.000Z",
    direction: "LONG",
    entryPrice: 100,
    markPrice: 102,
    stopLoss: 99,
    tp1Done: true,
  });
  assert.equal(result.code, "ULTRA_SHORT_MAX_HOLD_EXIT");
  assert.equal(result.shouldExit, true);
});
