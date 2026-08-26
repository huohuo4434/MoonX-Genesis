import type { ThreeHorizonCondition, ThreeHorizonStrategyType } from "@/types/three-horizon-strategy";

export type FunnelDecision = {
  strategyType: ThreeHorizonStrategyType;
  symbol: string;
  direction: string;
  status: string;
  conditions: ThreeHorizonCondition[];
  rejectionCode: string;
  rejectionReason: string;
  entryPrice: number | null;
  stopLoss: number | null;
  target1: number | null;
  target2: number | null;
  clientOid: string | null;
  bitgetOrderId: string | null;
  updatedAt: string;
};

export type CandidateFunnelStage = {
  key: "evaluated" | "directed" | "geometry" | "triggered" | "ready" | "attempted" | "opened";
  labelZh: string;
  count: number;
};

export type CandidateFunnelReason = {
  code: string;
  labelZh: string;
  count: number;
  symbols: string[];
};

const executionStatuses = new Set(["ORDER_SUBMITTED", "OPEN", "PARTIAL", "CLOSING", "CLOSED"]);
const readyStatuses = new Set(["READY", "SHADOW_READY", ...executionStatuses]);

const reasonLabels: Record<string, string> = {
  NO_DIRECTION: "没有当前有效正式方向",
  INVALID_LEVEL_GEOMETRY: "入场、止损或目标价格结构无效",
  ENTRY_NOT_TRIGGERED: "分钟级入场条件尚未触发",
  CONFIDENCE_LOW: "综合置信度不足",
  TECHNICAL_SCORE_LOW: "技术结构评分不足",
  MARKET_SESSION_CLOSED: "对应市场休市或流动性时段不允许开仓",
  NEW_ENTRIES_DISABLED: "当前只管理已有仓位，禁止新开仓",
  PLAN_LEAD_TIME: "计划发布时间不足，等待独立行情确认",
  RISK_BLOCKED: "组合风险或亏损保护阻断",
  ORDER_ERROR: "交易所预检或下单失败",
  ORDER_STATUS_UNKNOWN: "订单已远端提交，状态暂时无法确认",
  ORDER_SUBMITTED: "订单已提交，等待成交或仓位确认",
  STATUS_QUERY_BLOCK: "订单已有远端凭据，但状态查询受阻",
  TIME_EXIT_FAILED: "已持仓订单退出失败，等待托管重试",
  PROTECTION_ORDER_FAILED: "已持仓订单保护单设置失败",
  OBSERVING: "方向存在，继续等待结构确认",
  UNKNOWN: "未记录明确拒绝原因",
};

function chinaDateKey(value: string): string {
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return "";
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(time));
}

export function beijingDayUtcRange(now: Date): { start: Date; end: Date } {
  const dateKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(now);
  const start = new Date(`${dateKey}T00:00:00+08:00`);
  return { start, end: new Date(start.getTime() + 86_400_000) };
}

function validGeometry(row: FunnelDecision): boolean {
  const { entryPrice: entry, stopLoss: stop, target1, target2 } = row;
  if (![entry, stop, target1, target2].every((value) => typeof value === "number" && Number.isFinite(value) && value > 0)) return false;
  if (row.direction === "LONG") return stop! < entry! && entry! < target1! && target1! < target2!;
  if (row.direction === "SHORT") return stop! > entry! && entry! > target1! && target1! > target2!;
  return false;
}

function hasOrderAttemptEvidence(row: FunnelDecision): boolean {
  if (executionStatuses.has(row.status)) return true;
  if (row.bitgetOrderId) return true;
  if (row.rejectionCode === "ORDER_STATUS_UNKNOWN") return true;
  return row.status === "ERROR" && /^(ORDER_ERROR|TIME_EXIT_FAILED|PROTECTION_ORDER_FAILED)$/.test(row.rejectionCode);
}

function hasFormedPositionEvidence(row: FunnelDecision): boolean {
  if (["OPEN", "PARTIAL", "CLOSING", "CLOSED"].includes(row.status)) return true;
  return row.status === "ERROR" && /^(TIME_EXIT_FAILED|PROTECTION_ORDER_FAILED)$/.test(row.rejectionCode);
}

function reasonFor(row: FunnelDecision): string {
  if (row.direction !== "LONG" && row.direction !== "SHORT") return "NO_DIRECTION";
  if (!validGeometry(row)) return "INVALID_LEVEL_GEOMETRY";
  if (!row.conditions.some((condition) => condition.key === "entry" && condition.met)) return "ENTRY_NOT_TRIGGERED";
  return row.rejectionCode || (row.status === "OBSERVING" ? "OBSERVING" : row.status === "ERROR" ? "ORDER_ERROR" : "UNKNOWN");
}

function postAttemptReasonFor(row: FunnelDecision): string {
  if (row.rejectionCode === "ORDER_STATUS_UNKNOWN") return "ORDER_STATUS_UNKNOWN";
  if (row.status === "ERROR" && row.rejectionCode) return row.rejectionCode;
  if (row.status === "ORDER_SUBMITTED") return "ORDER_SUBMITTED";
  if (row.bitgetOrderId && row.rejectionCode) return row.rejectionCode;
  return "ORDER_SUBMITTED";
}

function reasonBuckets(rows: readonly FunnelDecision[], classify: (row: FunnelDecision) => string): CandidateFunnelReason[] {
  const buckets = new Map<string, { count: number; symbols: Set<string>; labelZh: string }>();
  for (const row of rows) {
    const code = classify(row);
    const bucket = buckets.get(code) ?? {
      count: 0,
      symbols: new Set<string>(),
      labelZh: (reasonLabels[code] ?? row.rejectionReason.trim()) || rowReasonFallback(code),
    };
    bucket.count += 1;
    bucket.symbols.add(row.symbol);
    buckets.set(code, bucket);
  }
  return [...buckets.entries()]
    .map(([code, bucket]) => ({ code, labelZh: bucket.labelZh, count: bucket.count, symbols: [...bucket.symbols].sort().slice(0, 8) }))
    .sort((a, b) => b.count - a.count || a.code.localeCompare(b.code))
    .slice(0, 8);
}

export function buildTradingCandidateFunnel(rows: readonly FunnelDecision[], now: Date) {
  const today = chinaDateKey(now.toISOString());
  const latest = new Map<string, FunnelDecision>();
  for (const row of rows) {
    if (chinaDateKey(row.updatedAt) !== today) continue;
    const key = `${row.strategyType}:${row.symbol.toUpperCase()}`;
    const previous = latest.get(key);
    if (!previous || Date.parse(row.updatedAt) > Date.parse(previous.updatedAt)) latest.set(key, { ...row, symbol: row.symbol.toUpperCase() });
  }
  const values = [...latest.values()];
  const forHorizon = (strategyType: ThreeHorizonStrategyType | "ALL") => {
    const current = strategyType === "ALL" ? values : values.filter((row) => row.strategyType === strategyType);
    const directed = current.filter((row) => row.direction === "LONG" || row.direction === "SHORT");
    const geometry = directed.filter((row) => validGeometry(row) || hasOrderAttemptEvidence(row));
    const triggered = geometry.filter((row) => row.conditions.some((condition) => condition.key === "entry" && condition.met) || hasOrderAttemptEvidence(row));
    const ready = triggered.filter((row) => readyStatuses.has(row.status) || hasOrderAttemptEvidence(row));
    const attempted = ready.filter(hasOrderAttemptEvidence);
    const opened = attempted.filter(hasFormedPositionEvidence);
    const notOpened = current.filter((item) => !hasFormedPositionEvidence(item));
    const noAttempt = notOpened.filter((row) => !hasOrderAttemptEvidence(row));
    const postAttempt = notOpened.filter(hasOrderAttemptEvidence);
    return {
      strategyType,
      stages: [
        { key: "evaluated", labelZh: "已评估", count: current.length },
        { key: "directed", labelZh: "有正式方向", count: directed.length },
        { key: "geometry", labelZh: "价格结构有效", count: geometry.length },
        { key: "triggered", labelZh: "入场已触发", count: triggered.length },
        { key: "ready", labelZh: "通过策略条件", count: ready.length },
        { key: "attempted", labelZh: "已尝试下单", count: attempted.length },
        { key: "opened", labelZh: "已形成仓位", count: opened.length },
      ] as CandidateFunnelStage[],
      noAttemptReasons: reasonBuckets(noAttempt, reasonFor),
      postAttemptReasons: reasonBuckets(postAttempt, postAttemptReasonFor),
    };
  };
  return {
    generatedAt: now.toISOString(),
    sampleRuleZh: "每个周期、每个标的只取北京时间当天最新决策；漏斗各层为前一层的严格子集。",
    overall: forHorizon("ALL"),
    horizons: (["INTRADAY", "SWING", "POSITION"] as const).map(forHorizon),
  };
}

function rowReasonFallback(code: string): string {
  return code.replaceAll("_", " ").toLowerCase();
}
