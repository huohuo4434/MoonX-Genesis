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
  {
    id: "captain-crypto-structure",
    internalName: "队长加密结构",
    publicLabel: "加密结构与点位观察",
    role: "TECHNICAL_LEVELS",
    allowedEffects: ["CONFIRMATION", "DELAY", "LEVELS", "VETO_NEW_ENTRY"],
    strengths: "能给出多周期支撑、压力和时间跨度，适合形成可验证的条件卡。",
    limits: "视频点位必须先通过实时行情合理性检查；跨周期观点不得混成同一执行信号。",
    ownsFormalDirection: false,
    canTriggerTradeAlone: false,
    automaticConsensus: false,
    validationState: "PROSPECTIVE_ONLY",
  },
  {
    id: "bubu-us-macro",
    internalName: "布布美股",
    publicLabel: "利率情景观察",
    role: "MACRO_REGIME",
    allowedEffects: ["RISK_LEVEL", "DELAY", "RESIZE", "VETO_NEW_ENTRY"],
    strengths: "预先列出收益率组合情景并在盘中验证，适合转化为宏观风险闸门。",
    limits: "个人仓位与收益叙述不作为证据；未核验发布时间的材料只能记笔记。",
    ownsFormalDirection: false,
    canTriggerTradeAlone: false,
    automaticConsensus: false,
    validationState: "PROSPECTIVE_ONLY",
  },
  {
    id: "stone-candlestick-method",
    internalName: "Stone K线方法",
    publicLabel: "群体行为方法观察",
    role: "CONTRARIAN_REVIEW",
    allowedEffects: ["RISK_LEVEL", "DELAY", "RESIZE", "VETO_NEW_ENTRY"],
    strengths: "强调技术形态的群体行为与自我实现属性，适合检查系统是否把形态当成绝对真理。",
    limits: "当前材料是方法导论，没有形成可交易的具体形态规则或市场方向。",
    ownsFormalDirection: false,
    canTriggerTradeAlone: false,
    automaticConsensus: false,
    validationState: "PROSPECTIVE_ONLY",
  },
  {
    id: "sweeper-systemic-risk",
    internalName: "扫地僧系统风险",
    publicLabel: "信用链风险观察",
    role: "MACRO_REGIME",
    allowedEffects: ["RISK_LEVEL", "DELAY", "RESIZE", "VETO_NEW_ENTRY"],
    strengths: "能把保险资金、私募信贷、AI基础设施和抵押品期限错配串成风险链。",
    limits: "叙事中的规模、评级和监管表述必须由原始资料核验；预警不等于危机确认。",
    ownsFormalDirection: false,
    canTriggerTradeAlone: false,
    automaticConsensus: false,
    validationState: "PROSPECTIVE_ONLY",
  },
];

export function findExternalAnalystSource(sourceId: string) {
  return EXTERNAL_ANALYST_ROLE_REGISTRY.find((source) => source.id === sourceId) ?? null;
}
