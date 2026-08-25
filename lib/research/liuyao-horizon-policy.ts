export const LIUYAO_HORIZON_POLICY_VERSION = "2026-08-25.v2" as const;

export type LiuyaoHorizonKind = "YEAR" | "QUARTER" | "MONTH" | "WEEK";
export type LiuyaoHorizonRequirement =
  | "BASELINE_REQUIRED"
  | "OPTIONAL_BRIDGE"
  | "ACTIVE_REQUIRED";

export type LiuyaoHorizonRule = {
  kind: LiuyaoHorizonKind;
  order: 1 | 2 | 3 | 4;
  labelZh: string;
  requirement: LiuyaoHorizonRequirement;
  requirementLabelZh: string;
  roleZh: string;
  refreshZh: string;
  maySetOfficialDirection: boolean;
  createsRoutineGap: boolean;
  fileNameTemplate: string;
  periodPlaceholder: string;
};

export const LIUYAO_HORIZON_RULES: readonly LiuyaoHorizonRule[] = [
  {
    kind: "YEAR",
    order: 1,
    labelZh: "年卦",
    requirement: "BASELINE_REQUIRED",
    requirementLabelZh: "年度基线",
    roleZh: "确定全年大环境、逐月涨跌候选、年度高低点候选月；已经发生的月份不回填预测。年卦可形成年度层正式版本，但不直接决定某一周。",
    refreshZh: "每个自然年一次；若老师发布新的年度卦，以新版本补充并保留旧记录。",
    maySetOfficialDirection: false,
    createsRoutineGap: true,
    fileNameTemplate: "BTC_六爻_年卦_2027",
    periodPlaceholder: "例如 2027年",
  },
  {
    kind: "QUARTER",
    order: 2,
    labelZh: "季卦",
    requirement: "OPTIONAL_BRIDGE",
    requirementLabelZh: "按需桥接",
    roleZh: "只在年卦跨度太大、季度发生制度/周期切换，或年卦与月卦难以衔接时补充；不能替代月卦或周卦。",
    refreshZh: "不固定要求，不计入日常缺卦报警；有明确老师季度卦或重大转折季度再算。",
    maySetOfficialDirection: false,
    createsRoutineGap: false,
    fileNameTemplate: "BTC_六爻_季卦_2026-Q4_可选",
    periodPlaceholder: "例如 2026年第四季度（可选）",
  },
  {
    kind: "MONTH",
    order: 3,
    labelZh: "月卦",
    requirement: "ACTIVE_REQUIRED",
    requirementLabelZh: "重点资产必需",
    roleZh: "校准年卦给出的当月候选，确定月内哪些周偏强或偏弱、先后顺序和关键时间窗；与年卦冲突时并列显示并降低信心，不越级替代当前周卦。",
    refreshZh: "重点资产每月一次，建议在上月末准备；老师同月卦优先保留为来源记录。",
    maySetOfficialDirection: false,
    createsRoutineGap: true,
    fileNameTemplate: "BTC_六爻_月卦_2026-09",
    periodPlaceholder: "例如 2026年9月",
  },
  {
    kind: "WEEK",
    order: 4,
    labelZh: "周卦",
    requirement: "ACTIVE_REQUIRED",
    requirementLabelZh: "重点资产必需",
    roleZh: "与月卦交叉后锁定本周短中线正式方向和先后节奏，再拆成交易日与关键窗；发布后保持历史，只能通过带原因的新版本修订。",
    refreshZh: "重点资产每周一次，周末准备下一周；日分析从周卦拆分，不要求另起日卦。",
    maySetOfficialDirection: true,
    createsRoutineGap: true,
    fileNameTemplate: "BTC_六爻_周卦_2026-08-31_2026-09-06",
    periodPlaceholder: "例如 2026-08-31至2026-09-06",
  },
] as const;

export const LIUYAO_REQUIRED_HORIZONS = LIUYAO_HORIZON_RULES
  .filter((rule) => rule.createsRoutineGap)
  .map((rule) => rule.kind);

export const LIUYAO_QUARTER_TRIGGER_RULES = [
  "年卦覆盖范围太宽，无法判断当前季度处于哪一段",
  "进入重大政策、选举、流动性或产业周期切换季度",
  "年卦与月卦存在跨层级冲突，需要桥接层解释",
  "老师提供了明确季度卦，值得单独保留和验证",
] as const;

export function getLiuyaoHorizonRule(kind: LiuyaoHorizonKind): LiuyaoHorizonRule {
  const rule = LIUYAO_HORIZON_RULES.find((item) => item.kind === kind);
  if (!rule) {
    throw new Error(`UNKNOWN_LIUYAO_HORIZON:${kind}`);
  }
  return rule;
}

export function formatLiuyaoPeriod(kind: LiuyaoHorizonKind, rawPeriod: string): string {
  const clean = rawPeriod
    .trim()
    .replace(/^(年卦|季卦|月卦|周卦)\s*[|｜:：]\s*/, "");
  if (!clean) return "";
  return `${getLiuyaoHorizonRule(kind).labelZh}｜${clean}`;
}

export function shouldCreateRoutineLiuyaoGap(kind: LiuyaoHorizonKind): boolean {
  return getLiuyaoHorizonRule(kind).createsRoutineGap;
}
