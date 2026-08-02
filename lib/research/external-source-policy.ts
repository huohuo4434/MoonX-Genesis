export type ExternalSourcePolicy = {
  id: string;
  label: string;
  category: "WAVE" | "INDUSTRY_CYCLE" | "TECHNICAL_BLOGGER" | "OPTIONS_FLOW" | "EXTERNAL_LIUYAO" | "ARCHIVE_ONLY";
  baseWeight: number;
  maxWeight: number;
  expiryDays: number;
  automaticConsensus: boolean;
  rule: string;
};

export const EXTERNAL_SOURCE_POLICIES: ExternalSourcePolicy[] = [
  {
    id: "teacher02-liuyao",
    label: "辅助导师02六爻路径",
    category: "EXTERNAL_LIUYAO",
    baseWeight: 10,
    maxWeight: 35,
    expiryDays: 9,
    automaticConsensus: false,
    rule: "只在六爻模块内部按资产专项权重参与；不覆盖已锁定预测、不单独触发交易，累计至少10个正式样本后再动态调整。",
  },
  {
    id: "wave-analyst",
    label: "波浪结构老师",
    category: "WAVE",
    baseWeight: 6,
    maxWeight: 10,
    expiryDays: 14,
    automaticConsensus: false,
    rule: "主要用于路径、支撑压力和转折窗口；满10个事前样本后再决定是否自动进入共识。",
  },
  {
    id: "memory-industry-cycle",
    label: "存储产业与周期观点",
    category: "INDUSTRY_CYCLE",
    baseWeight: 8,
    maxWeight: 12,
    expiryDays: 45,
    automaticConsensus: false,
    rule: "适用于MU、SNDK、SK海力士等中期产业判断，不直接决定日内买卖。",
  },
  {
    id: "technical-blogger",
    label: "技术与周期博主",
    category: "TECHNICAL_BLOGGER",
    baseWeight: 4,
    maxWeight: 8,
    expiryDays: 14,
    automaticConsensus: false,
    rule: "只保留有明确图形、时间窗口或失效条件的观点；事后复盘不计分。",
  },
  {
    id: "options-flow",
    label: "期权持仓与资金流",
    category: "OPTIONS_FLOW",
    baseWeight: 3,
    maxWeight: 5,
    expiryDays: 7,
    automaticConsensus: false,
    rule: "仅作短期拥挤度和风险观察，不单独形成方向。",
  },
  {
    id: "archive-only",
    label: "宣传性或无法验证观点",
    category: "ARCHIVE_ONLY",
    baseWeight: 0,
    maxWeight: 0,
    expiryDays: 0,
    automaticConsensus: false,
    rule: "保留原始材料，不进入预测和交易信号。",
  },
];

export function policyForTags(tags: string[]): ExternalSourcePolicy {
  const key = tags.find((tag) => tag.startsWith("policy:"))?.slice(7);
  return (
    EXTERNAL_SOURCE_POLICIES.find((item) => item.id === key) ??
    EXTERNAL_SOURCE_POLICIES[EXTERNAL_SOURCE_POLICIES.length - 1]!
  );
}
