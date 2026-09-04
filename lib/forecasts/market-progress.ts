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

function nearLevel(price: number | null, level: number | null, atr: number | null): boolean {
  if (price == null || level == null || !(price > 0) || !(level > 0)) return false;
  const tol = atr != null && atr > 0 ? atr * 0.35 : level * 0.004;
  return Math.abs(price - level) <= tol;
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

  const hitResistance = nearLevel(snap.lastPrice, snap.nearestResistance, snap.atr);
  const hitSupport = nearLevel(snap.lastPrice, snap.nearestSupport, snap.atr);
  const weekUp = (snap.weekReturnPct ?? 0) > 1.2;
  const weekDown = (snap.weekReturnPct ?? 0) < -1.2;

  // 先涨后跌 + early rally near resistance
  if (/先涨后跌/.test(weekly) && (hitResistance || weekUp)) {
    return {
      status: "AHEAD",
      revisionReason: hitResistance ? "已接近压力位，降低继续上涨信心" : "前段上涨已兑现，留意后续回吐",
      direction: baseDir,
      ...clampProb(22, 38, 40),
      expectedPath: "高位震荡或冲高回落，不宜继续机械追涨",
    };
  }

  if (/先涨后跌/.test(weekly) && !weekUp && !hitResistance && (snap.weekReturnPct ?? 0) < 0.3) {
    return {
      status: "DELAYED",
      revisionReason: "上涨尚未兑现，降低延续信心；不自动顺延原时间窗口",
      direction: baseDir || "先涨后跌",
      ...clampProb(input.baseUp - 4, input.baseFlat + 4, input.baseDown),
      expectedPath: input.basePath || "等待周初上涨窗口兑现",
    };
  }

  if (/震荡上涨/.test(weekly) && (hitResistance || weekUp)) {
    return {
      status: "AHEAD",
      revisionReason: hitResistance ? "已接近压力位，降低继续上涨信心" : "上涨已有进展，继续上行空间需要确认",
      direction: baseDir,
      ...clampProb(24, 42, 34),
      expectedPath: "继续上涨空间需要重新确认；留意压力受阻与回吐，不追高",
    };
  }

  if (/震荡下跌/.test(weekly) && (hitSupport || weekDown)) {
    return {
      status: "AHEAD",
      revisionReason: hitSupport ? "已接近支撑位，降低追空信心" : "下跌已有进展，留意反弹风险",
      direction: baseDir,
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
