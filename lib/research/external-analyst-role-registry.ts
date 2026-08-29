export type ExternalAnalystRole =
  | "MACRO_REGIME"
  | "TECHNICAL_LEVELS"
  | "CONTRARIAN_REVIEW"
  | "SENTIMENT_NARRATIVE";

export type ExternalAnalystEffect =
  | "RISK_LEVEL"
  | "CONFIRMATION"
  | "DELAY"
  | "RESIZE"
  | "LEVELS"
  | "VETO_NEW_ENTRY";

export type ExternalAnalystSourceProfile = {
  id: string;
  internalName: string;
  publicLabel: string;
  role: ExternalAnalystRole;
  allowedEffects: ExternalAnalystEffect[];
  strengths: string;
  limits: string;
  ownsFormalDirection: false;
  canTriggerTradeAlone: false;
  automaticConsensus: false;
  validationState: "PROSPECTIVE_ONLY";
};

export const EXTERNAL_ANALYST_ROLE_REGISTRY: ExternalAnalystSourceProfile[] = [
  {
    id: "jason-us-macro",
    internalName: "美投讲美股 Jason",
    publicLabel: "宏观环境观察",
    role: "MACRO_REGIME",
    allowedEffects: ["RISK_LEVEL", "DELAY", "RESIZE", "VETO_NEW_ENTRY"],
    strengths: "利率、通胀、就业和政策传导的因果链完整，适合判断市场环境。",
    limits: "宏观判断不提供可直接执行的个股入场和止损。",
    ownsFormalDirection: false,
    canTriggerTradeAlone: false,
    automaticConsensus: false,
    validationState: "PROSPECTIVE_ONLY",
  },
  {
    id: "rino-us-structure",
    internalName: "环球视野财经 RINO",
    publicLabel: "市场结构与点位观察",
    role: "TECHNICAL_LEVELS",
    allowedEffects: ["CONFIRMATION", "DELAY", "LEVELS", "VETO_NEW_ENTRY"],
    strengths: "常给出结构、支撑压力、确认与失效条件，便于事前验证。",
    limits: "点位只验证或细化正式方向，不得反转已经锁定的方向。",
    ownsFormalDirection: false,
    canTriggerTradeAlone: false,
    automaticConsensus: false,
    validationState: "PROSPECTIVE_ONLY",
  },
  {
    id: "nana-contrarian",
    internalName: "NaNa说美股",
    publicLabel: "反方与仓位纪律观察",
    role: "CONTRARIAN_REVIEW",
    allowedEffects: ["RISK_LEVEL", "DELAY", "RESIZE", "VETO_NEW_ENTRY"],
    strengths: "善于检查市场是否过度解读，并提供反方压力测试。",
    limits: "缺少完整确认或失效条件时只保留为风险意见，不形成点位卡。",
    ownsFormalDirection: false,
    canTriggerTradeAlone: false,
    automaticConsensus: false,
    validationState: "PROSPECTIVE_ONLY",
  },
  {
    id: "sunny-market-narrative",
    internalName: "阳光财经",
    publicLabel: "市场叙事与情绪观察",
    role: "SENTIMENT_NARRATIVE",
    allowedEffects: ["RISK_LEVEL", "CONFIRMATION"],
    strengths: "能快速归纳事件、板块和市场情绪，适合做信息索引。",
    limits: "叙事性或周期性结论必须再由原始数据与正式方法确认。",
    ownsFormalDirection: false,
    canTriggerTradeAlone: false,
    automaticConsensus: false,
    validationState: "PROSPECTIVE_ONLY",
  },
];

export function findExternalAnalystSource(sourceId: string) {
  return EXTERNAL_ANALYST_ROLE_REGISTRY.find((source) => source.id === sourceId) ?? null;
}
