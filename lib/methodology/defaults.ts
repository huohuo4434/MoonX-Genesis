import type { MethodologyConfig, MethodologyModule } from "@/lib/methodology/types";

/** Built-in defaults — 六爻 is the core pillar. */
export const DEFAULT_METHODOLOGY_MODULES: MethodologyModule[] = [
  {
    id: "liuyao",
    enabled: true,
    publicDisplay: true,
    nameZh: "六爻",
    nameEn: "Liu Yao (I Ching)",
    summaryZh:
      "核心主判断：用于判断市场主方向、阶段节奏与路径特征。六爻是综合体系中最重要的研究输入，不是确定性结论，也不构成必然涨跌承诺。",
    summaryEn:
      "Core judgment for primary direction and path. Liu Yao is the primary research input within the composite system — not deterministic prediction.",
    weightRangeZh: "核心（主判断）",
    weightRangeEn: "Core (primary)",
    updatedAt: "2026-07-29T00:00:00+08:00",
  },
  {
    id: "qimen",
    enabled: true,
    publicDisplay: true,
    nameZh: "奇门遁甲",
    nameEn: "Qi Men Dun Jia",
    summaryZh: "重要择时：辅助判断时间窗口、先跌后涨或先涨后跌等节奏。",
    summaryEn: "Timing assistant for windows and rhythm (e.g. dip-then-rise vs rise-then-fade).",
    weightRangeZh: "高",
    weightRangeEn: "High",
    updatedAt: "2026-07-29T00:00:00+08:00",
  },
  {
    id: "market_structure",
    enabled: true,
    publicDisplay: true,
    nameZh: "技术分析",
    nameEn: "Technical Analysis",
    summaryZh: "结构确认：趋势结构、支撑压力、运行路径与失效位。",
    summaryEn: "Structure confirmation: trend, support/resistance, path and invalidation.",
    weightRangeZh: "高",
    weightRangeEn: "High",
    updatedAt: "2026-07-29T00:00:00+08:00",
  },
  {
    id: "macro_flows",
    enabled: true,
    publicDisplay: true,
    nameZh: "消息面",
    nameEn: "News & Catalysts",
    summaryZh: "催化与风险校验：事件、政策、资金偏好与扰动因素。",
    summaryEn: "Catalyst and risk check: events, policy, flows and disruptions.",
    weightRangeZh: "中高",
    weightRangeEn: "Medium-high",
    updatedAt: "2026-07-29T00:00:00+08:00",
  },
  {
    id: "wave",
    enabled: true,
    publicDisplay: true,
    nameZh: "波浪分析",
    nameEn: "Wave Analysis",
    summaryZh: "辅助观察：接近波浪关键位时权重可临时提高，不构成预测主体。",
    summaryEn: "Supporting observation; weight may rise near key wave levels.",
    weightRangeZh: "辅助",
    weightRangeEn: "Auxiliary",
    updatedAt: "2026-07-29T00:00:00+08:00",
  },
  {
    id: "ai_quant",
    enabled: true,
    publicDisplay: true,
    nameZh: "AI／量化",
    nameEn: "AI & Quant",
    summaryZh: "辅助参考：概率分布、波动与形态统计，不单独构成交易指令。",
    summaryEn: "Supporting reference for probabilities and patterns — never a standalone signal.",
    weightRangeZh: "辅助",
    weightRangeEn: "Auxiliary",
    updatedAt: "2026-07-29T00:00:00+08:00",
  },
  {
    id: "analyst",
    enabled: false,
    publicDisplay: false,
    nameZh: "分析师情报",
    nameEn: "Analyst Intelligence",
    summaryZh: "汇总经过长期验证的外部分析观点。",
    summaryEn: "External research weighted by verified history.",
    weightRangeZh: "辅助",
    weightRangeEn: "Auxiliary",
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
