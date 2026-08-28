import type { ThreeHorizonStrategyType } from "@/types/three-horizon-strategy";
import type {
  BitgetLiveBlockerSummary,
  BitgetLiveHorizonCoverage,
  BitgetLiveTradingDiagnostics,
} from "@/types/bitget-demo-runtime";

export type LiveDiagnosticPlanRow = {
  strategy_type: ThreeHorizonStrategyType;
  symbol: string;
  direction: string;
  plan_tier: string;
  status: string;
  forecast_version: string | null;
  forecast_published_at: Date | string | null;
  forecast_locked_at: Date | string | null;
  forecast_valid_from: Date | string | null;
  forecast_valid_until: Date | string | null;
  last_checked_at: Date | string | null;
  updated_at: Date | string;
};

export type LiveDiagnosticDecisionRow = {
  strategy_type: ThreeHorizonStrategyType;
  symbol: string;
  status: string;
  direction: string;
  rejection_code: string;
  rejection_reason: string;
  client_oid: string | null;
  bitget_order_id: string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

export type LiveDiagnosticActivityRow = {
  strategy_type: ThreeHorizonStrategyType | "ALL";
  scan_runs: number | string;
  decisions: number | string;
  symbols_evaluated: number | string;
  order_decisions: number | string;
};

export type LiveDiagnosticBlockerRow = {
  rejection_code: string;
  occurrences: number | string;
  symbols: string[] | null;
  latest_at: Date | string | null;
};

const STRATEGIES: ThreeHorizonStrategyType[] = ["INTRADAY", "SWING", "POSITION"];
const ENTRY_READY_PLAN_STATUSES = new Set(["ARMED"]);

const NON_BLOCKING_CODES = new Set([
  "",
  "PROBE_ENTRY",
  "DAILY_ACTIVITY_PROBE",
  "DAILY_MINIMUM_EXECUTION",
  "LIVE_COMMISSIONING",
  "SCALE_IN_RECOVERED",
  "TIME_EXIT",
  "TP1_PROTECTION_TRANSITION",
]);

const BLOCKER_LABELS: Record<string, string> = {
  NO_DIRECTION: "缺少正式方向",
  CANONICAL_FORECAST_MISSING: "缺少锁定预测",
  FORECAST_AUTHORITY_UNAVAILABLE: "预测权威读取失败",
  CANONICAL_DIRECTION_MISMATCH: "正式方向不一致",
  DIRECTION_EVIDENCE_LOW: "方向证据不足",
  TECHNICAL_SCORE_LOW: "技术结构未达标",
  CONFIDENCE_LOW: "信心分不足",
  ENTRY_STRUCTURE_INVALID: "入场结构无效",
  REQUIRED_TIMEFRAME_UNAVAILABLE: "所需K线周期缺失",
  MARKET_SESSION_CLOSED: "市场休市",
  MARKET_SESSION_CLASSIFICATION_REQUIRED: "市场时段待识别",
  MARKET_SESSION_TIME_INVALID: "市场时间无效",
  PLAN_WAITING_TECHNICAL: "等待技术触发",
  REENTRY_COOLDOWN_ACTIVE: "再入场冷却中",
  REENTRY_TRIGGER_RESET_REQUIRED: "等待再次触发",
  FORECAST_VERSION_ORDER_ALREADY_BOUND: "该预测版本已有订单",
  NEW_ENTRIES_DISABLED: "统一新开仓闸门关闭",
  NEW_ENTRY_CUTOFF_REACHED: "新开仓时限已到",
  TIME_BUDGET_REACHED: "本轮扫描时间不足",
  RISK_FILTER: "风险过滤拦截",
  RISK_PLAN_INVALID: "风险计划无效",
  RISK_BLOCKED: "账户风险闸门拦截",
  ORDER_ERROR: "远端下单失败",
  ORDER_STATUS_UNKNOWN: "订单状态不确定",
  ORDER_PREFLIGHT_BLOCK: "下单前检查拦截",
  ACCOUNT_CONFIG_BLOCK: "账户配置拦截",
  STATUS_QUERY_BLOCK: "订单状态查询失败",
  RECONCILIATION_REQUIRED: "账户对账未完成",
  UNIFIED_CUSTODY_REGISTRATION_PENDING: "统一托管登记待完成",
  MARKET_ERROR: "行情读取失败",
  TIMING_RISK: "时序风险拦截",
};

function asIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function asCount(value: number | string | null | undefined): number {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? Math.max(0, Math.trunc(numeric)) : 0;
}

function key(strategy: ThreeHorizonStrategyType, symbol: string): string {
  return `${strategy}:${symbol.toUpperCase()}`;
}

function blockerLabel(code: string): string {
  if (BLOCKER_LABELS[code]) return BLOCKER_LABELS[code];
  if (code.includes("RISK")) return "风险控制拦截";
  if (code.includes("MARKET")) return "行情或市场时段拦截";
  if (code.includes("FORECAST") || code.includes("DIRECTION")) return "正式预测方向拦截";
  if (code.includes("ORDER")) return "订单执行拦截";
  return "其他执行条件未满足";
}

function horizonCoverage(input: {
  strategy: ThreeHorizonStrategyType;
  plan?: LiveDiagnosticPlanRow;
  decision?: LiveDiagnosticDecisionRow;
  nowMs: number;
}): BitgetLiveHorizonCoverage {
  const { strategy, plan, decision, nowMs } = input;
  const publishedAt = asIso(plan?.forecast_published_at);
  const publishedAtMs = publishedAt ? Date.parse(publishedAt) : Number.NaN;
  const lockedAt = asIso(plan?.forecast_locked_at);
  const lockedAtMs = lockedAt ? Date.parse(lockedAt) : Number.NaN;
  const validFrom = asIso(plan?.forecast_valid_from);
  const validFromMs = validFrom ? Date.parse(validFrom) : Number.NaN;
  const validUntil = asIso(plan?.forecast_valid_until);
  const validUntilMs = validUntil ? Date.parse(validUntil) : Number.NaN;
  const canonicalBinding = Boolean(
    plan &&
      plan.plan_tier === "FORMAL" &&
      (plan.direction === "LONG" || plan.direction === "SHORT") &&
      plan.forecast_version?.trim() &&
      Number.isFinite(publishedAtMs) &&
      Number.isFinite(lockedAtMs) &&
      Number.isFinite(validFromMs) &&
      Number.isFinite(validUntilMs)
  );
  const pending = Boolean(canonicalBinding && (publishedAtMs > nowMs || lockedAtMs > nowMs || validFromMs > nowMs));
  const expired = Boolean(canonicalBinding && validUntilMs <= nowMs);
  const direction = canonicalBinding && !pending && !expired ? (plan!.direction as "LONG" | "SHORT") : null;
  const armed = Boolean(direction && plan && ENTRY_READY_PLAN_STATUSES.has(plan.status));

  return {
    strategyType: strategy,
    direction,
    coverageState: expired ? "EXPIRED" : pending ? "PENDING" : direction ?? "MISSING",
    forecastVersion: plan?.forecast_version?.trim() || null,
    forecastPublishedAt: publishedAt,
    forecastValidFrom: validFrom,
    forecastValidUntil: validUntil,
    planStatus: plan?.status ?? null,
    armed,
    latestDecisionStatus: decision?.status ?? null,
    latestDecisionAt: asIso(decision?.updated_at ?? decision?.created_at),
    rejectionCode: decision?.rejection_code?.trim() || null,
    rejectionReason: decision?.rejection_reason?.trim() || null,
  };
}

export function buildLiveTradingDiagnostics(input: {
  allowedSymbols: string[];
  plans: LiveDiagnosticPlanRow[];
  decisions: LiveDiagnosticDecisionRow[];
  activity: LiveDiagnosticActivityRow[];
  blockers: LiveDiagnosticBlockerRow[];
  now?: Date;
}): BitgetLiveTradingDiagnostics {
  const now = input.now ?? new Date();
  const nowMs = now.getTime();
  const allowedSymbols = Array.from(new Set(input.allowedSymbols.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean)));
  const planByKey = new Map(input.plans.map((row) => [key(row.strategy_type, row.symbol), row]));
  const decisionByKey = new Map(input.decisions.map((row) => [key(row.strategy_type, row.symbol), row]));

  const coverage = allowedSymbols.map((symbol) => {
    const horizons = STRATEGIES.map((strategy) => horizonCoverage({
      strategy,
      plan: planByKey.get(key(strategy, symbol)),
      decision: decisionByKey.get(key(strategy, symbol)),
      nowMs,
    }));
    return {
      symbol,
      horizons,
      hasFormalDirection: horizons.some((row) => row.direction != null),
      hasArmedPlan: horizons.some((row) => row.armed),
    };
  });

  const strategyActivity = STRATEGIES.map((strategyType) => {
    const row = input.activity.find((item) => item.strategy_type === strategyType);
    const strategyCoverage = coverage.flatMap((item) => item.horizons.filter((horizon) => horizon.strategyType === strategyType));
    return {
      strategyType,
      scanRuns: asCount(row?.scan_runs),
      decisions: asCount(row?.decisions),
      symbolsEvaluated: asCount(row?.symbols_evaluated),
      formalDirections: strategyCoverage.filter((item) => item.direction != null).length,
      armedPlans: strategyCoverage.filter((item) => item.armed).length,
      orderDecisions: asCount(row?.order_decisions),
    };
  });

  const blockers: BitgetLiveBlockerSummary[] = input.blockers
    .filter((row) => row.rejection_code && !NON_BLOCKING_CODES.has(row.rejection_code))
    .map((row) => ({
      code: row.rejection_code,
      label: blockerLabel(row.rejection_code),
      occurrences: asCount(row.occurrences),
      symbols: Array.from(new Set((row.symbols ?? []).map((symbol) => String(symbol).toUpperCase()))).sort(),
      latestAt: asIso(row.latest_at),
    }))
    .sort((a, b) => b.occurrences - a.occurrences || a.code.localeCompare(b.code));

  return {
    generatedAt: now.toISOString(),
    windowHours: 24,
    allowedSymbols: allowedSymbols.length,
    symbolsWithFormalDirection: coverage.filter((row) => row.hasFormalDirection).length,
    formalDirectionSlots: coverage.flatMap((row) => row.horizons).filter((row) => row.direction != null).length,
    armedPlanSlots: coverage.flatMap((row) => row.horizons).filter((row) => row.armed).length,
    scanRuns: asCount(input.activity.find((row) => row.strategy_type === "ALL")?.scan_runs)
      || Math.max(0, ...strategyActivity.map((row) => row.scanRuns)),
    decisions: strategyActivity.reduce((sum, row) => sum + row.decisions, 0),
    symbolsEvaluated: new Set(input.decisions.map((row) => row.symbol.toUpperCase()).filter((symbol) => allowedSymbols.includes(symbol))).size,
    orderDecisions: strategyActivity.reduce((sum, row) => sum + row.orderDecisions, 0),
    strategyActivity,
    blockers,
    coverage,
  };
}
