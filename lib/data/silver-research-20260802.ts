import type { WeeklyAnalysisRecord } from "@/types/weekly-analysis";

/**
 * Locked silver research supplied on 2026-08-02.
 * Source priority: exact week > exact month > broad multi-month background.
 * Public copy is structured from the Liu-Yao sources; external video viewpoints
 * are risk/timing references only and never count as Liu-Yao consensus.
 */
export const SILVER_OVERLAP_AUDIT_20260802 = {
  overall: "主方向基本一致：8月前弱后修复，9月至11月偏强，12月震荡偏多。",
  consistentSources: [
    "2026-07-24：未来一个月，山风蛊变山水蒙——先整理、后修复，过程反复。",
    "2026-07-28：至8月31日，泽天夬变水风井——前段承压，后段出现修复条件。",
    "2026-08-02：8月整月，兑为泽变地风升——先跌后涨，高波动中逐步修复。",
    "2026-07-28及2026-08-02年底总卦——秋冬恢复条件增强，但不是单边直线上涨。",
  ],
  localConflict:
    "唯一需要降权处理的分歧是：较早的三个月粗周期认为8月7日后仍偏弱，而8月2日新起的17日至30日周卦给出更明确的反弹窗口。系统按精度优先采用新周卦，同时保留旧周期为风险背景。",
  resolutionRule:
    "同一时间重合时采用精度优先：当周卦覆盖当月卦，当月卦覆盖多月卦；旧卦不删除，只用于降低置信度和设置失效条件。",
} as const;

export const SILVER_AUGUST_MONTHLY_OUTLOOK = {
  assetId: "silver",
  assetName: "国际银价",
  assetNameEn: "Silver",
  symbol: "SILVER",
  venue: "COMEX白银期货",
  venueEn: "COMEX silver futures",
  periodStart: "2026-08-01",
  periodEnd: "2026-08-31",
  direction: "先跌后涨",
  probabilities: { up: 35, flat: 40, down: 25 },
  path:
    "上旬先弱并反复测试支撑；10日至16日进入企稳修复，17日至23日是月内较明显反弹窗口；24日至30日前段延续修复，后段波动重新放大，防止冲高回落。",
  pathEn:
    "The first part of the month is weaker and may repeatedly test support. Stabilization develops from Aug 10–16, with the clearest rebound window from Aug 17–23. Recovery can extend early in Aug 24–30 before volatility rises again and creates rally-then-fade risk.",
  keyWindow: "8月17日至23日反弹最明确；24日至30日后段防波动扩大。",
  keyWindowEn: "The clearest rebound window is Aug 17–23; watch for expanding volatility late in Aug 24–30.",
  risk:
    "旧三个月卦仍提示申月兄弟金压制财爻；新周卦虽给出中下旬反弹，但主变卦多见六冲，反弹速度快、回撤也快，不定义为稳定主升。",
  riskEn:
    "The older three-month study still shows Shen-month metal constraining the Wealth line. Newer weekly studies support a mid-to-late-month rebound, but repeated six-clash structures imply fast rallies and fast pullbacks rather than a stable primary uptrend.",
  sourceNote:
    "2026-08-02白银8月月卦、四段周卦与此前重合卦交叉；外部观点只用于风险修订，不计入六爻共识。",
  sourceNoteEn:
    "The Aug 2 monthly study and four weekly segments were cross-checked against overlapping earlier studies. External views are used only for risk revision and do not count toward Liu Yao consensus.",
  sourceComplete: true,
} as const;

const PUBLISHED_AT = "2026-08-01T11:58:00+08:00";
const UPDATED_AT = "2026-08-02T13:08:00+08:00";

export const SILVER_WEEKLY_ANALYSIS_20260803: WeeklyAnalysisRecord = {
  id: "WEEKLY-SILVER-20260803-V2",
  assetId: "silver",
  assetName: "国际银价",
  symbol: "SILVER",
  displaySymbol: "SI",
  weekStart: "2026-08-03",
  weekEnd: "2026-08-09",
  overallDirection: "探底回升",
  weeklyPath:
    "周初仍以承压和下探为主，财爻伏藏且兄弟申金持世，不宜提前抢多；后半周存在止跌和短线修复条件，但反弹力度有限。8月7日前后进入申月，波动可能放大，先确认支撑再看反抽。",
  headline:
    "白银下周先跌后稳：前半周继续承压，后半周关注止跌修复，不把反抽定义为新主升。",
  probabilities: { up: 25, flat: 40, down: 35 },
  strongWindow: "8月7日至9日的止跌与短线修复观察窗口",
  weakWindow: "8月3日至6日的承压和下探阶段",
  keySupport: [],
  keyResistance: [],
  invalidation:
    "若后半周仍持续放量创新低且无法收回短线平台，则探底回升路径失效，继续按偏弱处理。",
  confirmation:
    "先停止创新低，再出现短周期低点抬高或放量收复短线平台，才确认修复；接近支撑时不追空。",
  catalysts: ["子孙爻带来的阶段修复条件", "高波动品种的空头回补"],
  risks: [
    "财爻伏藏",
    "兄弟申金持世并临近申月",
    "旧三个月卦与新周卦在中下旬强弱上存在局部分歧",
  ],
  riskLevel: "高",
  confidence: 63,
  publishedAt: PUBLISHED_AT,
  updatedAt: UPDATED_AT,
  status: "published",
  visibility: "member",
  sourceIds: [
    "silver:20260802:month-august",
    "silver:20260802:week-0803-0809",
    "silver:20260728:through-0831",
    "silver:overlap-audit-20260802",
  ],
  version: 2,
  originalLocked: true,
  revisions: [
    {
      version: 1,
      previousContent:
        "原版本仅依据较早三个月卦，判断8月7日后弱势与大幅波动风险上升。",
      changedAt: UPDATED_AT,
      reason:
        "补入2026-08-02精确覆盖8月3日至9日的周卦，并按精确周期优先规则修订为先跌后稳、后半周观察修复。",
    },
  ],
};

export const SILVER_FUTURE_RESEARCH_WINDOWS_20260802 = [
  { start: "2026-08-10", end: "2026-08-16", direction: "震荡修复", note: "周初仍受压，周中以后修复条件改善。" },
  { start: "2026-08-17", end: "2026-08-23", direction: "震荡上涨", note: "月内较明显反弹窗口，但六冲结构提示急涨急跌。" },
  { start: "2026-08-24", end: "2026-08-30", direction: "先涨后跌", note: "前段延续修复，后段分歧和回撤风险上升。" },
  { start: "2026-09-01", end: "2026-09-30", direction: "震荡上涨", note: "财爻临月，属于年底前较强月份。" },
  { start: "2026-10-01", end: "2026-10-31", direction: "先涨后跌", note: "前段冲高，后段高波动和回撤风险增大。" },
  { start: "2026-11-01", end: "2026-11-30", direction: "震荡上涨", note: "整理后仍有上行条件，但不要求连续拉升。" },
  { start: "2026-12-01", end: "2026-12-31", direction: "先跌后涨", note: "先整理后逐步走强，整体震荡偏多。" },
] as const;
