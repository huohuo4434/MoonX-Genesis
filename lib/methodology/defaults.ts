import type { MethodologyConfig, MethodologyModule } from "@/lib/methodology/types";

/** Built-in defaults reflecting modules actually used in the live forecast stack. */
export const DEFAULT_METHODOLOGY_MODULES: MethodologyModule[] = [
  {
    id: "ai_quant",
    enabled: true,
    publicDisplay: true,
    nameZh: "AI与量化分析",
    nameEn: "AI & Quantitative Analysis",
    summaryZh:
      "分析价格趋势、波动率、动量、历史形态、相关资产表现和概率分布。作为综合体系中的研究维度之一，不单独构成交易指令。",
    summaryEn:
      "Examines trend, volatility, momentum, historical patterns, cross-asset behavior and probability distributions. One research input within the composite system — never a standalone trading instruction.",
    weightRangeZh: "参考区间约 20–40%，随样本与近期表现动态调整",
    weightRangeEn: "Reference range ~20–40%, adjusted by sample size and recent performance",
    updatedAt: "2026-07-29T00:00:00+08:00",
  },
  {
    id: "liuyao",
    enabled: true,
    publicDisplay: true,
    nameZh: "六爻与时间结构",
    nameEn: "I Ching Timing Analysis",
    summaryZh:
      "作为独立的时间与节奏研究维度，用于判断市场可能出现的方向、阶段变化和路径特征。它只是综合体系中的一个研究输入，不是确定性结论，也不构成“算命”或必然涨跌承诺。",
    summaryEn:
      "Used as an independent timing and market-path research input for possible direction, phase shifts and path traits. It is one research dimension within the composite system — not deterministic prediction or fortune-telling.",
    weightRangeZh: "参考区间约 20–30%，按历史验证与市场适配度调整",
    weightRangeEn: "Reference range ~20–30%, adjusted by validation and market fit",
    updatedAt: "2026-07-29T00:00:00+08:00",
  },
  {
    id: "market_structure",
    enabled: true,
    publicDisplay: true,
    nameZh: "市场结构与技术分析",
    nameEn: "Market Structure",
    summaryZh: "研究趋势结构、支撑压力、突破、失效位置、周期关系和运行路径。",
    summaryEn:
      "Evaluates trend structure, support, resistance, breakouts, invalidation levels and expected paths.",
    weightRangeZh: "参考区间约 10–25%，随结构清晰度调整",
    weightRangeEn: "Reference range ~10–25%, adjusted by structure clarity",
    updatedAt: "2026-07-29T00:00:00+08:00",
  },
  {
    id: "wave",
    enabled: true,
    publicDisplay: true,
    nameZh: "波浪分析",
    nameEn: "Wave Analysis",
    summaryZh:
      "用于辅助判断市场所处阶段和潜在关键区域。默认影响较低，只有价格接近波浪关键位并出现确认时，权重才会提高。",
    summaryEn:
      "Used as supporting evidence for market phase and key zones. Its influence rises only when price approaches a relevant level and confirmation appears.",
    weightRangeZh: "默认较低（约 5%），接近关键位并确认后可动态提高（上限约 20%）",
    weightRangeEn: "Low by default (~5%); may rise near confirmed key levels (cap ~20%)",
    updatedAt: "2026-07-29T00:00:00+08:00",
  },
  {
    id: "macro_flows",
    enabled: true,
    publicDisplay: true,
    nameZh: "资金与宏观因素",
    nameEn: "Flows & Macro",
    summaryZh: "研究资金流、市场风险偏好、重要经济数据、政策变化和事件催化。",
    summaryEn: "Tracks capital flows, risk appetite, macro data, policy changes and event catalysts.",
    weightRangeZh: "参考区间约 8–20%，按数据完整度与新鲜度动态调整",
    weightRangeEn: "Reference range ~8–20%, adjusted by data completeness and freshness",
    updatedAt: "2026-07-29T00:00:00+08:00",
  },
  {
    id: "analyst",
    // Intelligence snapshot / analyst DB is off by default — do not advertise as live.
    enabled: false,
    publicDisplay: false,
    nameZh: "分析师情报",
    nameEn: "Analyst Intelligence",
    summaryZh: "汇总经过长期验证的外部分析观点，并根据历史表现给予不同权重。",
    summaryEn:
      "Aggregates external research inputs and weights them according to verified historical performance.",
    weightRangeZh: "根据历史验证动态调整",
    weightRangeEn: "Dynamically adjusted by historical validation",
    updatedAt: "2026-07-29T00:00:00+08:00",
  },
];

export function defaultMethodologyConfig(): MethodologyConfig {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    modules: DEFAULT_METHODOLOGY_MODULES.map((m) => ({ ...m })),
  };
}
