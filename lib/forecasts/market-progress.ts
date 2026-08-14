import { normalizeFormalDirection } from "@/lib/forecasts/formal-direction";
import type { MarketProgressStatus } from "@/lib/weekly-source/types";

export type MarketSnapshot = {
  lastPrice: number | null;
  previousClose: number | null;
  weekOpen: number | null;
  weekHigh: number | null;
  weekLow: number | null;
  nearestSupport: number | null;
  nearestResistance: number | null;
  atr: number | null;
  weekReturnPct: number | null;
};

export type ProgressAssessment = {
  status: MarketProgressStatus;
  revisionReason: string | null;
  direction: string;
  upProbability: number;
  sidewaysProbability: number;
  downProbability: number;
  expectedPath: string;
};

function clampProb(up: number, flat: number, down: number): {
  upProbability: number;
  sidewaysProbability: number;
  downProbability: number;
} {
  const u = Math.max(5, Math.min(80, Math.round(up)));
  let f = Math.max(5, Math.min(80, Math.round(flat)));
  let d = Math.max(5, Math.min(80, Math.round(down)));
  const sum = u + f + d;
  if (sum !== 100) {
    const diff = 100 - sum;
    f = Math.max(5, f + diff);
    const sum2 = u + f + d;
    if (sum2 !== 100) d = Math.max(5, 100 - u - f);
  }
  return { upProbability: u, sidewaysProbability: f, downProbability: d };
}

function nearLevel(price: number | null, level: number | null, atr: number | null, side: "SUPPORT" | "RESISTANCE"): boolean {
  if (price == null || level == null || !(price > 0) || !(level > 0)) return false;
  const tol = atr != null && atr > 0 ? atr * 0.35 : level * 0.004;
  return Math.abs(price - level) <= tol || (side === "RESISTANCE" ? price >= level * 0.998 : price <= level * 1.002);
}

export function assessMarketProgress(input: {
  weeklyDirection: string;
  weeklyPath: string;
  baseDirection: string;
  baseUp: number;
  baseFlat: number;
  baseDown: number;
  basePath: string;
  snapshot: MarketSnapshot;
  invalidationTriggered?: boolean;
}): ProgressAssessment {
  const weekly = normalizeFormalDirection(input.weeklyDirection);
  const baseDir = normalizeFormalDirection(input.baseDirection);
  const snap = input.snapshot;

  if (input.invalidationTriggered) {
    const probs = clampProb(30, 40, 30);
    return {
      status: "INVALIDATED",
      revisionReason: "价格触发执行失效位：停止当前执行计划并建立新版本评估；不倒改玄学方向",
      direction: baseDir,
      ...probs,
      expectedPath: "失效后进入修正路径，等待新确认",
    };
  }

  const hitResistance = nearLevel(snap.lastPrice, snap.nearestResistance, snap.atr, "RESISTANCE");
  const hitSupport = nearLevel(snap.lastPrice, snap.nearestSupport, snap.atr, "SUPPORT");
  const weekUp = (snap.weekReturnPct ?? 0) > 1.2;
  const weekDown = (snap.weekReturnPct ?? 0) < -1.2;

  // 先涨后跌 + early rally near resistance
  if (/先涨后跌/.test(weekly) && (hitResistance || weekUp)) {
    return {
      status: "AHEAD",
      revisionReason: "上涨提前兑现并接近压力位",
      direction: "冲高回落",
      ...clampProb(22, 38, 40),
      expectedPath: "高位震荡或冲高回落，不宜继续机械追涨",
    };
  }

  if (/先涨后跌/.test(weekly) && !weekUp && !hitResistance && (snap.weekReturnPct ?? 0) < 0.3) {
    return {
      status: "DELAYED",
      revisionReason: "周初上涨尚未兑现，上涨窗口向后顺延（未触发失效）",
      direction: baseDir || "先涨后跌",
      ...clampProb(Math.min(70, input.baseUp + 4), input.baseFlat, Math.max(15, input.baseDown - 4)),
      expectedPath: input.basePath || "等待周初上涨窗口兑现",
    };
  }

  if (/震荡上涨/.test(weekly) && (hitResistance || weekUp)) {
    return {
      status: "AHEAD",
      revisionReason: "已实现路径接近技术压力位：公开日预测进入高位兑现分支，锁定周预测保持不变",
      direction: "冲高回落",
      ...clampProb(24, 42, 34),
      expectedPath: "高位震荡或冲高回落，不再重复输出上涨",
    };
  }

  if (/震荡下跌/.test(weekly) && (hitSupport || weekDown)) {
    return {
      status: "AHEAD",
      revisionReason: "已实现路径接近技术支撑位：公开日预测进入探底回升分支，锁定周预测保持不变",
      direction: "探底回升",
      ...clampProb(36, 40, 24),
      expectedPath: "支撑附近震荡或探底回升，不宜机械追空",
    };
  }

  return {
    status: snap.lastPrice == null ? "NOT_STARTED" : "ON_TRACK",
    revisionReason: null,
    direction: baseDir,
    ...clampProb(input.baseUp, input.baseFlat, input.baseDown),
    expectedPath: input.basePath,
  };
}
