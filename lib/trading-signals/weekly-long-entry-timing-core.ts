import { isFormallyLockedForecast } from "@/lib/trading-signals/formal-forecast-lock-core";

export type WeeklyLongEntryTimingGate = { blocked: boolean; riskMatched: string | null; reason: string };

export type WeeklyTimingEntryEligibility = {
  eligible: boolean;
  rejectionCode: "WEEKLY_LONG_TIMING_BLOCK" | null;
};

const LATE_LONG_RISK_TERMS = [
  "冲高回落", "阶段顶部", "阶段高点", "兑现风险", "反弹尾段", "减损回吐",
  "高点/变盘", "高位震荡", "高位回落", "冲高后防回吐",
] as const;

function parseMarketDay(value: string | null, endOfDay = false): number {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return Number.NaN;
  return Date.parse(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}+08:00`);
}

/** Locked weekly timing may delay a swing long, but never creates or flips direction. */
export function evaluateWeeklyLongEntryTiming(input: {
  strategyType: "INTRADAY" | "SWING" | "POSITION";
  direction: "LONG" | "SHORT" | "NEUTRAL";
  weeklyPath: string | null;
  weeklyStatus: string | null;
  weeklyPublishedAt: string | null;
  weeklyLockedAt: string | null;
  weeklyPeriodStart: string | null;
  weeklyPeriodEnd: string | null;
  nowMs: number;
  atDirectionalEdge: boolean;
  falseBreakReclaimed: boolean;
}): WeeklyLongEntryTimingGate {
  if (input.strategyType !== "SWING" || input.direction !== "LONG") {
    return { blocked: false, riskMatched: null, reason: "仅审查新波段多仓，不改变其他周期或方向。" };
  }
  const periodStart = parseMarketDay(input.weeklyPeriodStart);
  const periodEnd = parseMarketDay(input.weeklyPeriodEnd, true);
  if (
    !isFormallyLockedForecast({
      status: input.weeklyStatus,
      publishedAt: input.weeklyPublishedAt,
      lockedAt: input.weeklyLockedAt,
      nowMs: input.nowMs,
    }) ||
    !Number.isFinite(periodStart) || !Number.isFinite(periodEnd) ||
    periodStart >= periodEnd || input.nowMs < periodStart || input.nowMs > periodEnd
  ) {
    return { blocked: false, riskMatched: null, reason: "缺少当前有效且可定位日期的事前锁定周内路径，不以不可靠文本新增门禁。" };
  }
  const path = input.weeklyPath?.trim() ?? "";
  const riskMatched = LATE_LONG_RISK_TERMS.find((term) => path.includes(term)) ?? null;
  if (!riskMatched) return { blocked: false, riskMatched: null, reason: "锁定周内路径未声明顶部兑现或回吐风险。" };

  // The wording describes a late-week risk. It must not block Monday merely because
  // the full-week narrative mentions what may happen later. Use Hong Kong market days
  // from the immutable forecast period and fail open if that period is unavailable.
  const lateWindowStartsAt = periodStart + Math.floor((periodEnd - periodStart) / 2);
  if (input.nowMs < lateWindowStartsAt) {
    return { blocked: false, riskMatched, reason: "尚未进入锁定预测所指的周后段，不提前阻断新波段多仓。" };
  }
  if (input.atDirectionalEdge || input.falseBreakReclaimed) {
    return { blocked: false, riskMatched, reason: `周内路径含“${riskMatched}”，但价格已回到多头关键下沿或假跌破收回，可继续接受原硬风控。` };
  }
  return {
    blocked: true,
    riskMatched,
    reason: `事前锁定周内路径明确“${riskMatched}”；当前已进入周后段、未回到多头关键下沿且无假跌破收回，本轮禁止新波段多仓，不能用技术分抵消时序冲突。`,
  };
}

/** Production-shared composition: timing can only remove eligibility, never add it. */
export function applyWeeklyTimingToEntryEligibility(input: {
  otherwiseEligible: boolean;
  timing: WeeklyLongEntryTimingGate;
}): WeeklyTimingEntryEligibility {
  if (input.timing.blocked) {
    return { eligible: false, rejectionCode: "WEEKLY_LONG_TIMING_BLOCK" };
  }
  return { eligible: input.otherwiseEligible, rejectionCode: null };
}
