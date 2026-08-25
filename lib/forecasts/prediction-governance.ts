import {
  OFFICIAL_DIRECTION_VALUES,
  normalizeOfficialDirection,
  type OfficialDirection,
} from "./formal-direction";

export type GovernanceMarket = "crypto" | "us" | "cn" | "hk" | "commodity";
export const MOOX_PREDICTION_GOVERNANCE_VERSION = "2026-08-25.v4" as const;

export const MOOX_LIUYAO_SOURCE_ARBITRATION = {
  defaultAuthority: "TEACHER_SOFT_PRIORITY_55_TO_45",
  prePublicationException: "USER_LIUYAO_WHEN_QIMEN_ANALYST_MAJORITY_AND_CHAN_ALL_ALIGN",
  externalLayersChooseBetweenLiuyaoCandidatesOnly: true,
  externalLayersMaySetDirectionDirectly: false,
  lockedForecastsRemainImmutable: true,
} as const;

export type GovernanceLayerId =
  | "HORIZON_CONTEXT"
  | "WEEKLY_LIUYAO"
  | "QIMEN_TIMING"
  | "TECHNICAL_EXECUTION"
  | "AI_RISK"
  | "QUANT_EXECUTION";

export type GovernanceLayer = {
  id: GovernanceLayerId;
  order: 1 | 2 | 3 | 4 | 5 | 6;
  nameZh: string;
  nameEn: string;
  authorityZh: string;
  authorityEn: string;
  maySetOfficialDirection: boolean;
  mayChangeLockedDirection: false;
};

export const MOOX_PREDICTION_LAYERS: readonly GovernanceLayer[] = [
  {
    id: "HORIZON_CONTEXT",
    order: 1,
    nameZh: "大周期环境",
    nameEn: "Higher-horizon context",
    authorityZh: "年卦形成年度正式背景与逐月候选，月卦校准当月路线，周卦再锁定本周方向；年/月或月/周冲突必须并列并降低信心。季卦只在重大切换或跨层级冲突时按需补充。上级周期不越级替代周卦。",
    authorityEn: "Yearly readings define the annual regime and monthly readings define the active phase. Quarterly readings are optional bridges for major transitions or cross-horizon conflicts. These layers contextualize the week but do not replace the weekly reading.",
    maySetOfficialDirection: false,
    mayChangeLockedDirection: false,
  },
  {
    id: "WEEKLY_LIUYAO",
    order: 2,
    nameZh: "周卦锁定方向",
    nameEn: "Weekly Liu Yao direction lock",
    authorityZh: "当前有效周卦或阶段卦拥有短中期正式方向权。老师卦默认略优先；若发布前奇门、独立博主严格多数与缠论全部支持同周期用户卦，则改由用户六爻定方向并保留老师分歧。一经发布锁定，只能通过新版本修订。",
    authorityEn: "The active weekly or stage Liu Yao record owns direction. Teacher charts have a soft default priority; before publication only, unanimous Qimen, independent-analyst majority and Chan support may select the same-window user Liu Yao candidate while preserving the teacher disagreement. Locked publications require a new version.",
    maySetOfficialDirection: true,
    mayChangeLockedDirection: false,
  },
  {
    id: "QIMEN_TIMING",
    order: 3,
    nameZh: "奇门拆时间窗口",
    nameEn: "Qimen timing windows",
    authorityZh: "奇门、万年历与干支窗口拆节奏和关键时间；奇门不能单独翻转方向，但可在发布前参与两份冲突六爻的来源裁决。",
    authorityEn: "Qimen, calendar and sexagenary windows refine timing and rhythm. Qimen cannot flip direction alone, but may join pre-publication arbitration between conflicting Liu Yao candidates.",
    maySetOfficialDirection: false,
    mayChangeLockedDirection: false,
  },
  {
    id: "TECHNICAL_EXECUTION",
    order: 4,
    nameZh: "缠论与技术找位置",
    nameEn: "Chan and technical execution",
    authorityZh: "判断结构是否完成、支撑压力、入场、止损与盈亏比；不能独立改方向，但可在发布前作为两份冲突六爻的第三方结构验证。",
    authorityEn: "Determines structure completion, levels, entries, stops and risk/reward. It cannot change direction alone, but may serve as pre-publication structure evidence between conflicting Liu Yao candidates.",
    maySetOfficialDirection: false,
    mayChangeLockedDirection: false,
  },
  {
    id: "AI_RISK",
    order: 5,
    nameZh: "AI信息过滤与风险闸门",
    nameEn: "AI information and risk gate",
    authorityZh: "AI可提醒风险、降低仓位或延迟执行、否决一笔交易；无权修改已锁定方向。",
    authorityEn: "AI may flag risk, reduce or delay execution, or block a trade. It cannot edit the locked direction.",
    maySetOfficialDirection: false,
    mayChangeLockedDirection: false,
  },
  {
    id: "QUANT_EXECUTION",
    order: 6,
    nameZh: "量化严格执行",
    nameEn: "Rule-based quantitative execution",
    authorityZh: "只有方向明确、位置合适、风险可控三者同时成立时才执行；预测存在不等于必须交易。",
    authorityEn: "Execution is allowed only when direction, location and risk all pass. A valid forecast does not require a trade.",
    maySetOfficialDirection: false,
    mayChangeLockedDirection: false,
  },
] as const;

export const MOOX_DAILY_ANALYSIS_POLICY = {
  requiresDailyHexagram: false,
  allowedSources: ["WEEKLY_DERIVED", "STAGE_DERIVED"] as const,
  ruleZh: "不单独要求日卦。日分析由当前有效周卦或阶段卦拆解，再由缠论、真实K线、支撑压力、成交与波动验证执行位置。",
  ruleEn: "No separate daily hexagram is required. Daily analysis is derived from the active weekly or stage reading, then checked with Chan structure, real candles, levels, volume and volatility.",
} as const;

export const MOOX_AI_PERMISSIONS = ["RISK_ALERT", "REDUCE_OR_DELAY", "BLOCK_EXECUTION"] as const;
export const MOOX_AI_FORBIDDEN_PERMISSION = "CHANGE_LOCKED_DIRECTION" as const;

export const MOOX_LOCK_POLICY = {
  lockedRecordImmutable: true,
  revisionsRequireNewVersion: true,
  preserveFailedAndPartialSamples: true,
  oneCurrentVersionPerAssetSession: true,
  ruleZh: "已发布预测永久保留。修订必须生成新版本并说明原因；当前页只展示最新有效版本，历史版本和失败样本不得删除。",
  ruleEn: "Published forecasts are immutable. Revisions require a new version and reason; current views show one active version while history and failed samples remain preserved.",
} as const;

export const MOOX_TOP5_POLICY = {
  directionRequired: true,
  technicalLocationRequired: true,
  riskRewardRequired: true,
  currentWeekWindowRequired: true,
  aShareLongOnly: true,
  ruleZh: "前5不是最看涨的5只，而是方向明确、位置合适、盈亏比合格且本周可执行的少数标的。A股只有共识上涨才能进入前5；极强看跌只作风险备注。",
  ruleEn: "Top 5 means actionable opportunities with clear direction, valid location, acceptable risk/reward and a current-week window. A-shares enter only on bullish consensus; extreme bearish cases are risk notes only.",
} as const;

export const MOOX_METRIC_SEPARATION = {
  direction: "涨跌路径结论",
  probability: "情景概率或历史校准概率",
  consensusStars: "方法共识度，不代表涨幅",
  riskLevel: "潜在波动和损失风险",
  executionStatus: "当前是否具备交易位置",
} as const;

export type ExecutionGateAction = "EXECUTE" | "WAIT" | "REDUCE_SIZE" | "BLOCK";
export type ExecutionGateInput = {
  officialDirection: string | null | undefined;
  technicalConfirmed: boolean;
  riskRewardAcceptable: boolean;
  eventRisk: "LOW" | "MEDIUM" | "HIGH" | "EXTREME";
  hardRiskBlocked?: boolean;
};
export type ExecutionGateResult = {
  officialDirection: OfficialDirection;
  action: ExecutionGateAction;
  directionChanged: false;
  reasonZh: string;
};

export function evaluateExecutionGate(input: ExecutionGateInput): ExecutionGateResult {
  const officialDirection = normalizeOfficialDirection(input.officialDirection);
  if (input.hardRiskBlocked || input.eventRisk === "EXTREME") {
    return { officialDirection, action: "BLOCK", directionChanged: false, reasonZh: "风险闸门否决本次执行，但不修改已锁定方向。" };
  }
  if (!input.technicalConfirmed || !input.riskRewardAcceptable) {
    return { officialDirection, action: "WAIT", directionChanged: false, reasonZh: "方向保留，当前没有合格技术位置或盈亏比，暂不交易。" };
  }
  if (input.eventRisk === "HIGH") {
    return { officialDirection, action: "REDUCE_SIZE", directionChanged: false, reasonZh: "方向和位置通过，但事件风险较高，降低仓位或延迟执行。" };
  }
  return { officialDirection, action: "EXECUTE", directionChanged: false, reasonZh: "方向明确、位置合适、风险可控，可以按既定规则执行。" };
}

export type GovernanceValidationInput = {
  direction: string | null | undefined;
  probabilities?: { up: number; flat: number; down: number } | null;
  dailySource?: "WEEKLY_DERIVED" | "STAGE_DERIVED" | "DAILY_HEXAGRAM" | null;
  technicalChangedDirection?: boolean;
  isAShareTop5?: boolean;
  technicalLocationReady?: boolean;
  riskRewardAcceptable?: boolean;
};

export function validatePredictionGovernance(input: GovernanceValidationInput): string[] {
  const errors: string[] = [];
  const normalized = normalizeOfficialDirection(input.direction);
  if (!OFFICIAL_DIRECTION_VALUES.includes(normalized)) errors.push("OFFICIAL_DIRECTION_INVALID");
  if (input.probabilities) {
    const total = input.probabilities.up + input.probabilities.flat + input.probabilities.down;
    if (total !== 100) errors.push("PROBABILITIES_MUST_SUM_TO_100");
  }
  if (input.dailySource === "DAILY_HEXAGRAM") errors.push("DAILY_HEXAGRAM_NOT_REQUIRED");
  if (input.technicalChangedDirection) errors.push("TECHNICAL_MUST_NOT_CHANGE_DIRECTION");
  if (input.isAShareTop5) {
    const bullish = normalized === "上涨" || normalized === "震荡上涨" || normalized === "先跌后涨";
    if (!bullish) errors.push("A_SHARE_TOP5_REQUIRES_BULLISH_CONSENSUS");
    if (!input.technicalLocationReady) errors.push("TOP5_REQUIRES_TECHNICAL_LOCATION");
    if (!input.riskRewardAcceptable) errors.push("TOP5_REQUIRES_ACCEPTABLE_RISK_REWARD");
  }
  return errors;
}

export function validateLockedForecastRevision(input: {
  currentVersion: number;
  nextVersion: number;
  locked: boolean;
  directionChanged: boolean;
  revisionReason?: string | null;
}): string[] {
  if (!input.locked || !input.directionChanged) return [];
  const errors: string[] = [];
  if (input.nextVersion <= input.currentVersion) errors.push("LOCKED_DIRECTION_REQUIRES_NEW_VERSION");
  if (!String(input.revisionReason ?? "").trim()) errors.push("LOCKED_REVISION_REASON_REQUIRED");
  return errors;
}

export function tradingDaysForWeeklyDerivation(market: GovernanceMarket, dates: string[]): string[] {
  if (market === "crypto") return [...dates];
  return dates.filter((date) => {
    const day = new Date(`${date}T12:00:00Z`).getUTCDay();
    return day !== 0 && day !== 6;
  });
}
