import { isFormallyLockedForecast } from "@/lib/trading-signals/formal-forecast-lock-core";

export type WeeklyLongEntryTimingGate = { blocked: boolean; riskMatched: string | null; reason: string };

export type NewExposureAction =
  | "COMMISSIONING_ENTRY"
  | "NORMAL_PROFILE_ENTRY"
  | "DAILY_MINIMUM_ENTRY"
  | "ACTIVITY_FALLBACK_ENTRY"
  | "SCALE_IN"
  | "RISK_REDUCTION";

export type NewExposureSafetyGate = {
  allowed: boolean;
  rejectionCode: "TIMING_RISK" | "RECONCILIATION_REQUIRED" | null;
  reason: string;
};

export type ExposureLedgerEntry = {
  symbol: string;
  side: "long" | "short";
};

export function isExposureLedgerConsistent(input: {
  positions: readonly ExposureLedgerEntry[];
  protections: readonly ExposureLedgerEntry[];
  activeDecisions: readonly ExposureLedgerEntry[];
}): boolean {
  const key = (row: ExposureLedgerEntry) => `${row.symbol.toUpperCase()}:${row.side}`;
  const counts = (rows: readonly ExposureLedgerEntry[]) => {
    const result = new Map<string, number>();
    for (const row of rows) result.set(key(row), (result.get(key(row)) ?? 0) + 1);
    return result;
  };
  const positions = counts(input.positions);
  const protections = counts(input.protections);
  const decisions = counts(input.activeDecisions);
  const keys = new Set([...positions.keys(), ...protections.keys(), ...decisions.keys()]);
  for (const item of keys) {
    if (positions.get(item) !== 1 || protections.get(item) !== 1 || decisions.get(item) !== 1) return false;
  }
  return true;
}

const LATE_LONG_RISK_TERMS = [
  "SURGE_THEN_PULLBACK",
  "先涨后跌",
  "冲高回落",
  "阶段顶部",
  "阶段高点",
  "兑现风险",
  "反弹尾段",
  "减损回吐",
  "高点/变盘",
  "高位震荡",
  "高位回落",
  "冲高后防回吐",
] as const;

function parseMarketDay(value: string | null, endOfDay = false): number {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return Number.NaN;
  const parts = value.split("-").map(Number);
  const year = parts[0]!;
  const month = parts[1]!;
  const day = parts[2]!;
  const roundTrip = new Date(Date.UTC(year, month - 1, day));
  if (
    roundTrip.getUTCFullYear() !== year ||
    roundTrip.getUTCMonth() !== month - 1 ||
    roundTrip.getUTCDate() !== day
  ) return Number.NaN;
  const parsed = Date.parse(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}+08:00`);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

/**
 * A formally locked weekly path may remove permission for a new long exposure.
 * It never creates direction, flips a position short, or forces an existing exit.
 */
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
  // Retained for caller compatibility. Technical location cannot override a
  // formally locked late-period timing risk.
  atDirectionalEdge: boolean;
  falseBreakReclaimed: boolean;
}): WeeklyLongEntryTimingGate {
  if (input.direction !== "LONG") {
    return { blocked: false, riskMatched: null, reason: "该门禁只限制新增多头敞口，不创造或翻转方向。" };
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
    return { blocked: false, riskMatched: null, reason: "缺少当前有效、事前发布并锁定的周预测，不从不可靠文本新增门禁。" };
  }
  const path = input.weeklyPath?.trim() ?? "";
  const riskMatched = LATE_LONG_RISK_TERMS.find((term) => path.includes(term)) ?? null;
  if (!riskMatched) {
    return { blocked: false, riskMatched: null, reason: "正式周内路径未声明后段冲高回落或顶部兑现风险。" };
  }

  const lateWindowStartsAt = periodStart + Math.floor((periodEnd - periodStart) / 2);
  if (input.nowMs < lateWindowStartsAt) {
    return { blocked: false, riskMatched, reason: "尚未进入正式预测周期后半段，不提前阻断新增多头敞口。" };
  }
  return {
    blocked: true,
    riskMatched,
    reason: `正式锁定周预测在当前周期后半段明确包含“${riskMatched}”；禁止新增或追加多头敞口。技术下沿或收回信号不能单独解除该时序门禁。`,
  };
}

/** Central fail-closed policy shared by every new-exposure route. */
export function evaluateNewExposureSafety(input: {
  action: NewExposureAction;
  direction: "LONG" | "SHORT" | "NEUTRAL";
  authorityReadsOk: boolean;
  ledgerConsistent: boolean;
  timing: WeeklyLongEntryTimingGate;
}): NewExposureSafetyGate {
  if (input.action === "RISK_REDUCTION") {
    return {
      allowed: true,
      rejectionCode: null,
      reason: "风险降低操作不受新增敞口门禁阻断。",
    };
  }
  if (!input.authorityReadsOk || !input.ledgerConsistent) {
    return {
      allowed: false,
      rejectionCode: "RECONCILIATION_REQUIRED",
      reason: "正式预测、交易所持仓、保护单或策略账本的权威读取/对账未完成；禁止新增或追加敞口，只允许风险降低。",
    };
  }
  if (input.direction === "LONG" && input.timing.blocked) {
    return { allowed: false, rejectionCode: "TIMING_RISK", reason: input.timing.reason };
  }
  return { allowed: true, rejectionCode: null, reason: "新增敞口通过时序与权威对账门禁。" };
}

/** Backward-compatible evaluation composition used by strategy readiness. */
export function applyWeeklyTimingToEntryEligibility(input: {
  otherwiseEligible: boolean;
  timing: WeeklyLongEntryTimingGate;
}): { eligible: boolean; rejectionCode: "TIMING_RISK" | null } {
  if (input.timing.blocked) return { eligible: false, rejectionCode: "TIMING_RISK" };
  return { eligible: input.otherwiseEligible, rejectionCode: null };
}
