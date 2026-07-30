/**
 * Research Intelligence module — data layer.
 *
 * MoonX aggregates a broad range of external market commentary and price
 * signal, classifies it, then reconciles it through a fixed set of internal
 * analysis frameworks. External sources are never named or exposed; only
 * MoonX's own internal framework names appear anywhere in this module.
 *
 * "Database-ready" pattern: every type below is shaped like a future
 * database table (stable `id`, explicit field types, an `updatedAt`
 * timestamp), and the mock arrays are only ever read through the `list*`/
 * `get*` accessor functions at the bottom of this file. Nothing else in the
 * app imports the arrays directly. That means swapping the function bodies
 * for real queries (e.g. Supabase) later is a one-file change — no call
 * site anywhere else needs to know the data used to be static.
 */
import type { ForecastDirection } from "./demo-content";

export type FrameworkCategory = "Symbolic Systems" | "Price Structure" | "Time & Cycle" | "Flow & Risk" | "Macro";

/**
 * The closed set of anonymous MoonX framework names. This is the only
 * vocabulary allowed anywhere framework evidence is cited — external
 * analyst identities are never used.
 */
export type MoonXFrameworkName =
  | "Oracle Six Yao"
  | "Cycle Structure"
  | "Gann Structure"
  | "Harmonic Structure"
  | "Market Flow & Risk"
  | "Macro Capital Cycle"
  | "Technical Structure";

/** Maps 1:1 to the eventual `analyst_frameworks` database table. */
export interface AnalystFramework {
  id: string;
  name: MoonXFrameworkName;
  category: FrameworkCategory;
  /** 0–100, backtested reliability of this framework's calls historically. */
  reliabilityScore: number;
  /** 0–100, contribution weight applied when reconciling frameworks into a MoonX consensus. */
  weight: number;
  description: string;
  updatedAt: string;
}

const analystFrameworkDatabase: AnalystFramework[] = [
  {
    id: "oracle-six-yao",
    name: "Oracle Six Yao",
    category: "Symbolic Systems",
    reliabilityScore: 70,
    weight: 20,
    description:
      "A structured symbolic framework MoonX uses to model cyclical change and transition points in market structure.",
    updatedAt: "2026-07-26",
  },
  {
    id: "cycle-structure",
    name: "Cycle Structure",
    category: "Time & Cycle",
    reliabilityScore: 72,
    weight: 20,
    description:
      "Studies recurring temporal intervals — peaks, troughs, and turning windows — across historical data.",
    updatedAt: "2026-07-26",
  },
  {
    id: "gann-structure",
    name: "Gann Structure",
    category: "Time & Cycle",
    reliabilityScore: 68,
    weight: 12,
    description: "Applies geometric time-and-price cycle analysis to frame potential inflection windows.",
    updatedAt: "2026-07-26",
  },
  {
    id: "harmonic-structure",
    name: "Harmonic Structure",
    category: "Price Structure",
    reliabilityScore: 65,
    weight: 10,
    description:
      "Identifies repeating structural wave and harmonic patterns in price action to contextualize potential turning points.",
    updatedAt: "2026-07-26",
  },
  {
    id: "market-flow-risk",
    name: "Market Flow & Risk",
    category: "Flow & Risk",
    reliabilityScore: 63,
    weight: 13,
    description:
      "Tracks fund flow, positioning, and ETF/institutional activity to flag risk that may conflict with other frameworks.",
    updatedAt: "2026-07-26",
  },
  {
    id: "macro-capital-cycle",
    name: "Macro Capital Cycle",
    category: "Macro",
    reliabilityScore: 66,
    weight: 10,
    description: "Assesses macro capital allocation and sector rotation trends behind broader market moves.",
    updatedAt: "2026-07-26",
  },
  {
    id: "technical-structure",
    name: "Technical Structure",
    category: "Price Structure",
    reliabilityScore: 74,
    weight: 15,
    description: "Classical price-and-volume structure analysis used to cross-check signals from other frameworks.",
    updatedAt: "2026-07-26",
  },
];

export interface DailyIntelligenceReport {
  id: string;
  asset: string;
  symbol: string;
  /** ISO date this report was generated. */
  date: string;
  marketConsensus: ForecastDirection;
  /** 0–100 */
  bullishScore: number;
  /** 0–100 */
  bearishScore: number;
  keyFactors: string[];
  riskFactors: string[];
  finalView: string;
}

const dailyIntelligenceReports: DailyIntelligenceReport[] = [
  {
    id: "btc-2026-07-26",
    asset: "Bitcoin",
    symbol: "BTC",
    date: "2026-07-26",
    marketConsensus: "up",
    bullishScore: 71,
    bearishScore: 29,
    keyFactors: [
      "Technical Structure flags a higher-low structure holding above key support.",
      "Harmonic Structure places price in an early impulsive phase.",
      "Cycle Structure flags this week as a historically favorable window.",
    ],
    riskFactors: [
      "Macro liquidity conditions remain a wildcard heading into quarter-end.",
      "Gann Structure flags a short-term timing conflict worth monitoring.",
    ],
    finalView:
      "MoonX's internal frameworks lean bullish for Bitcoin over the near term, with the strongest agreement across Technical and Harmonic Structure. Confidence is moderate given mixed macro signals.",
  },
];

export interface ResearchPipelineStage {
  id: string;
  order: number;
  title: string;
  description: string;
}

export interface SixYaoFinancialRule {
  id: string;
  order: number;
  text: string;
}

const researchPipelineStages: ResearchPipelineStage[] = [
  {
    id: "signals",
    order: 1,
    title: "人工收集外部信息",
    description: "用户人工整理分析师观点、原始卦盘、市场事件和技术资料。",
  },
  {
    id: "classification",
    order: 2,
    title: "AI结构化整理",
    description: "按资产、周期、方向、价格、时间、来源和证据类型进行分类。",
  },
  {
    id: "weighting",
    order: 3,
    title: "多框架校准",
    description: "分别评估六爻、技术面、宏观事件和分析师历史可靠性。",
  },
  {
    id: "consensus",
    order: 4,
    title: "人工审核",
    description: "MoonX结论必须由用户确认，不允许模型或技术信号自动发布。",
  },
  {
    id: "output",
    order: 5,
    title: "发布与验证",
    description: "发布结构化、带版本号和验证日期的预测；到期记录命中、部分命中、失效或失败。",
  },
];

const sixYaoFinancialRules: SixYaoFinancialRule[] = [
  { id: "rule-01", order: 1, text: "卦名和卦辞只作辅助，权重原则上不超过20%。" },
  {
    id: "rule-02",
    order: 2,
    text: "用神必须依据问题确定：问价格以妻财为主用神、子孙观察动力；问风险看官鬼；问政策监管看父母；兄弟观察耗财与抛压。",
  },
  { id: "rule-03", order: 3, text: "黑天鹅重点看官鬼。" },
  { id: "rule-04", order: 4, text: "政策、监管、平台规则重点看父母。" },
  { id: "rule-05", order: 5, text: "世爻代表标的自身，应爻代表外部环境。" },
  { id: "rule-06", order: 6, text: "财爻临值、出空、出伏属于直接高权重信号。" },
  { id: "rule-07", order: 7, text: "通过兄弟旺、父母生兄弟推导的低点属于间接信号。" },
  { id: "rule-08", order: 8, text: "长期卦重趋势，具体节气窗口允许提前或推迟约10天。" },
  {
    id: "rule-09",
    order: 9,
    text: "朱雀、青龙、白虎等六神只描述事件性质，不能称为动爻；应写“某爻发动，临朱雀”。",
  },
  {
    id: "rule-10",
    order: 10,
    text: "禁止固定用神排序或机械套用同一套规则；不同问题必须重新确定用神。",
  },
];

/**
 * Data-access layer.
 *
 * These resolve synchronously today, but are written `async` on purpose —
 * every call site already `await`s them, so pointing them at a real
 * database later is a drop-in change.
 */
export async function listAnalystFrameworks(): Promise<AnalystFramework[]> {
  return analystFrameworkDatabase;
}

export async function getAnalystFramework(id: string): Promise<AnalystFramework | undefined> {
  return analystFrameworkDatabase.find((framework) => framework.id === id);
}

export async function listDailyIntelligenceReports(): Promise<DailyIntelligenceReport[]> {
  return dailyIntelligenceReports;
}

export async function getDailyIntelligenceReport(id: string): Promise<DailyIntelligenceReport | undefined> {
  return dailyIntelligenceReports.find((report) => report.id === id);
}

export async function listResearchPipelineStages(): Promise<ResearchPipelineStage[]> {
  return [...researchPipelineStages].sort((a, b) => a.order - b.order);
}

export async function listSixYaoFinancialRules(): Promise<SixYaoFinancialRule[]> {
  return [...sixYaoFinancialRules].sort((a, b) => a.order - b.order);
}
