// MOOX_RESEARCH_PROTOCOL_V72092
export const MOOX_RESEARCH_PROTOCOL_VERSION = "7.20.9.2" as const;

export type QimenCastKind = "PRIMARY" | "AUXILIARY";
export type AnalystHorizon = "SHORT" | "MEDIUM" | "LONG" | "UNSPECIFIED";
export type AnalystDirection = "BULLISH" | "BEARISH" | "NEUTRAL" | "UNKNOWN";

export interface QimenCastMetadata {
  asset: string;
  targetTradingDate: string;
  question: string;
  castLocation: string;
  localTime: string;
  utcTime: string;
  kind: QimenCastKind;
  voidBranches?: string[];
  voidHandling?: string;
  seasonalStrength?: string;
  palaceTransfer?: string;
}

export interface QimenCastLockResult {
  accepted: boolean;
  reason: "PRIMARY_LOCKED" | "PRIMARY_ALREADY_EXISTS" | "AUXILIARY_ACCEPTED";
  record: QimenCastMetadata;
}

export interface ExternalAnalystView {
  analyst: string;
  asset: string;
  horizon: AnalystHorizon;
  direction: AnalystDirection;
  summary: string;
  timeWindow: string;
  confidence?: number;
  positionHint?: string;
  candidateStatus?: "CONFIRMED" | "INFERRED" | "UNKNOWN";
}

export interface TechnicalHierarchy {
  macroMapLabel: string;
  firstSupport: string;
  secondSupport: string;
  firstResistance: string;
  secondResistance: string;
  weakeningLevel: string;
  invalidationLevel: string;
  executionLayer: "15m/5m";
}

const NON_EMPTY = /\S/;

export function validateQimenCastMetadata(input: QimenCastMetadata): string[] {
  const errors: string[] = [];
  const required: Array<[string, string]> = [
    ["asset", input.asset],
    ["targetTradingDate", input.targetTradingDate],
    ["question", input.question],
    ["castLocation", input.castLocation],
    ["localTime", input.localTime],
    ["utcTime", input.utcTime],
  ];

  for (const [field, value] of required) {
    if (!NON_EMPTY.test(value)) errors.push(`${field}不能为空`);
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.targetTradingDate)) {
    errors.push("targetTradingDate必须为YYYY-MM-DD");
  }

  const hasDirectionQuestion = /(上涨|下跌|看涨|看跌|方向|趋势|多头|空头)/.test(input.question);
  if (!hasDirectionQuestion) errors.push("正式问题必须包含可验证的方向或趋势判定");

  return errors;
}

export function lockQimenCast(
  existingPrimary: QimenCastMetadata | null,
  candidate: QimenCastMetadata,
): QimenCastLockResult {
  if (candidate.kind === "AUXILIARY") {
    return { accepted: true, reason: "AUXILIARY_ACCEPTED", record: candidate };
  }

  if (existingPrimary) {
    return { accepted: false, reason: "PRIMARY_ALREADY_EXISTS", record: existingPrimary };
  }

  return { accepted: true, reason: "PRIMARY_LOCKED", record: candidate };
}

function classifyAnalystHorizon(source: string): AnalystHorizon {
  if (/(盘前|盘中|今晚|明天|次日|1\s*[—-]?\s*3天|1\s*day|2\s*day|3\s*day|短线|intraday|tomorrow)/i.test(source)) {
    return "SHORT";
  }
  if (/(本周|下周|几周|1\s*[—-]?\s*2个月|1\s*month|2\s*month|中期|8月|9月|10月|swing)/i.test(source)) {
    return "MEDIUM";
  }
  if (/(半年|一年|两年|三年|长期|长线|2027|2028|multi-year|long term)/i.test(source)) {
    return "LONG";
  }
  return "UNSPECIFIED";
}

export function inferAnalystHorizon(timeWindow: string, summary = ""): AnalystHorizon {
  const explicit = classifyAnalystHorizon(timeWindow.toLowerCase());
  if (explicit !== "UNSPECIFIED") return explicit;
  return classifyAnalystHorizon(summary.toLowerCase());
}

export function inferAnalystDirection(value: string): AnalystDirection {
  if (/(看多|看涨|做多|bullish|upside|上涨)/i.test(value)) return "BULLISH";
  if (/(看空|看跌|做空|bearish|downside|下跌)/i.test(value)) return "BEARISH";
  if (/(中性|震荡|neutral|sideways)/i.test(value)) return "NEUTRAL";
  return "UNKNOWN";
}

export function normalizeConfidence(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.min(100, value));
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value.replace("%", ""));
    if (Number.isFinite(parsed)) return Math.max(0, Math.min(100, parsed));
  }
  return undefined;
}

export function buildTechnicalHierarchy(input: Partial<TechnicalHierarchy>): TechnicalHierarchy {
  return {
    macroMapLabel: input.macroMapLabel ?? "大级别价格地图（仅做上下文）",
    firstSupport: input.firstSupport ?? "—",
    secondSupport: input.secondSupport ?? "—",
    firstResistance: input.firstResistance ?? "—",
    secondResistance: input.secondResistance ?? "—",
    weakeningLevel: input.weakeningLevel ?? "—",
    invalidationLevel: input.invalidationLevel ?? "—",
    executionLayer: "15m/5m",
  };
}

export const RESEARCH_AUTHORITY_CHAIN = [
  "奇门：第一方向与时间节奏",
  "六爻：辅助确认与风险提示",
  "Stone等外部分析师：情绪 / 仓位 / 候选标的雷达",
  "环球视野：大级别支撑压力与突破/失效地图",
  "1H缠论：当日实际支撑压力",
  "15m/5m：执行入场",
] as const;
