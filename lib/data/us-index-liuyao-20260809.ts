/**
 * SPX / NDX Liu Yao extension supplied on 2026-08-09.
 * Raw screenshots are intentionally not bundled because they contain personal
 * identifying birth data. This module stores only redacted research evidence.
 */
import { lt } from "@/lib/i18n/config";
import type { ResearchRecord } from "@/types/research";

const INGESTED_AT = "2026-08-09T13:52:00+08:00";

function record(input: {
  id: string;
  assetId: "sp500" | "nasdaq-100";
  symbol: "SPX" | "NDX";
  start: string;
  end: string;
  horizonZh: string;
  primary: string;
  changed?: string;
  direction: ResearchRecord["direction"];
  confidence: number;
  titleZh: string;
  summaryZh: string;
  thesisZh: string[];
  consensusEligible?: boolean;
  humanReviewStatus?: "pending-review" | "approved";
  tags?: string[];
}): ResearchRecord {
  const nameZh = input.assetId === "sp500" ? "标普500" : "纳斯达克100";
  const nameEn = input.assetId === "sp500" ? "S&P 500" : "Nasdaq 100";
  return {
    id: input.id,
    publishedAt: "2026-08-09",
    sourcePublishedAt: "2026-08-09",
    sourcePublishedAtVerified: true,
    ingestedAt: INGESTED_AT,
    forecastStart: input.start,
    forecastEnd: input.end,
    assetId: input.assetId,
    assetName: lt(nameZh, nameZh, nameEn),
    symbol: input.symbol,
    market: "index",
    framework: "oracle-six-yao",
    sourceType: "internal-research",
    publicSourceLabel: lt("MOOX六爻研究", "MOOX六爻研究", "MOOX Six-Yao Research"),
    direction: input.direction,
    editorialConfidence: input.confidence,
    consensusEligible: input.consensusEligible ?? true,
    layer: "strategic",
    horizon: lt(input.horizonZh, input.horizonZh, input.horizonZh),
    title: lt(input.titleZh, input.titleZh, input.titleZh),
    summary: lt(input.summaryZh, input.summaryZh, input.summaryZh),
    thesis: input.thesisZh.map((t) => lt(t, t, t)),
    hexagramPrimary: lt(input.primary, input.primary, input.primary),
    hexagramChanged: input.changed ? lt(input.changed, input.changed, input.changed) : undefined,
    verificationChecklist: [
      lt("到期后只按锁定版本验证方向和路径，不事后改卦。", "到期後只按鎖定版本驗證方向和路徑，不事後改卦。", "Verify only against the locked version; never rewrite after outcome."),
    ],
    humanReviewStatus: input.humanReviewStatus ?? "approved",
    humanReviewChecklist: {
      screenshotVerified: true,
      sixRelativesVerified: true,
      worldResponseVerified: true,
      movingLinesVerified: true,
      transformedLinesVerified: true,
      monthDayStrengthVerified: true,
      cycleComparisonVerified: true,
    },
    status: "active",
    visibility: "internal",
    tags: [input.assetId, "oracle-six-yao", "uploaded-20260809", ...(input.tags ?? [])],
  };
}

export const usIndexLiuyao20260809Records: ResearchRecord[] = [
  record({
    id: "ORACLE-SPX-WEEK-20260810-REVIEW-20260809",
    assetId: "sp500", symbol: "SPX", start: "2026-08-10", end: "2026-08-16", horizonZh: "2026-08-10至08-16",
    primary: "天水讼（游魂）", changed: "火地晋（游魂）", direction: "bullish", confidence: 81,
    titleZh: "标普500下周：正式看涨，先争后进",
    summaryZh: "按老师01的财爻/子孙优先法，妻财申金发动并临申月得令，子孙辰土发动可生财，世爻兄弟午火在申月失势，整体利多。按老师02严格法，主卦先看讼，九二先退避，九五‘元吉’，最终化晋，路径是先有争议或回撤、随后推进。两套方法同向，正式方向为上涨。",
    thesisZh: [
      "老师01：财申发动临月最关键，子孙辰土发动助财；兄弟午火不当令，克财压力减弱。",
      "老师02：讼九二先退、九五元吉，化晋为进；不是单边直冲，而是先争后进。",
      "与8月分段卦‘8/10-16为最强修复窗口’同向，形成内部多周期共振。"
    ], tags: ["weekly-20260810", "teacher01-method", "teacher02-method"],
  }),
  record({
    id: "ORACLE-NDX-WEEK-20260808-REVIEW-20260809",
    assetId: "nasdaq-100", symbol: "NDX", start: "2026-08-08", end: "2026-08-16", horizonZh: "2026-08-08至08-16",
    primary: "地水师（归魂）", changed: "山雷颐（游魂）", direction: "bearish", confidence: 77,
    titleZh: "纳斯达克100下周：正式看跌，中段有反弹",
    summaryZh: "按老师01方法，妻财午火持世但在申月失令，子孙寅木虽动却逢空并受申冲，反弹根基偏弱；8月月卦也给出中段偏弱。按老师02严格法，师卦初六先见纪律/失序风险，九二有修复，上六收束，化颐更偏整理养息，因此周内可反弹，但整周不定义成上涨。正式方向为下跌。",
    thesisZh: [
      "老师01：财世午火失令，子孙寅木空且受申冲，做多力量不足。",
      "老师02：师卦初段先承压，九二带来中段修复，最终颐卦偏整理而非全面主升。",
      "8月月卦与本周旺衰同向偏弱；外部QQQ六爻也给出周初下探、周中反弹、周五修正。"
    ], tags: ["weekly-20260810", "teacher01-method", "teacher02-method"],
  }),
  record({
    id: "ORACLE-SPX-OCT-20260809",
    assetId: "sp500", symbol: "SPX", start: "2026-10-01", end: "2026-10-31", horizonZh: "2026年10月",
    primary: "火泽睽", changed: "乾为天（六冲）", direction: "neutral", confidence: 61,
    titleZh: "标普500十月：分歧放大，方向不够干净",
    summaryZh: "睽主背离分歧，化乾六冲后力量放大但波动也放大。按严格法不把强势卦名直接等同上涨，因此十月正式结论暂定方向不明确、高波动。",
    thesisZh: ["主卦先看睽：市场内部不同步。", "变乾六冲：力量增强但不稳定，不能据此硬判单边。"],
  }),
  record({
    id: "ORACLE-SPX-NOV-20260809",
    assetId: "sp500", symbol: "SPX", start: "2026-11-01", end: "2026-11-30", horizonZh: "2026年11月",
    primary: "水火既济", changed: "天山遁", direction: "bearish", confidence: 72,
    titleZh: "标普500十一月：由成转退，正式看跌",
    summaryZh: "既济是阶段完成，变遁是退避。两套方法都更支持高位成果兑现后退让，而不是继续追高。",
    thesisZh: ["主卦既济：阶段任务已完成，盛中防衰。", "变卦遁：核心动作是退避，方向指向回撤。"],
  }),
  record({
    id: "ORACLE-SPX-DEC-20260809",
    assetId: "sp500", symbol: "SPX", start: "2026-12-01", end: "2026-12-31", horizonZh: "2026年12月",
    primary: "坤为地（六冲）", changed: "水泽节（六合）", direction: "slightly-bearish", confidence: 66,
    titleZh: "标普500十二月：先弱后收敛，偏空但不看崩",
    summaryZh: "坤六冲先体现松散和压力，化节六合后转向约束与稳定。月内更像先弱、后收敛。",
    thesisZh: ["六冲先放大波动和松散。", "六合节卦后段约束风险，偏向止跌收敛而非持续崩落。"],
  }),
  record({
    id: "ORACLE-SPX-H2-TO-DEC31-20260809",
    assetId: "sp500", symbol: "SPX", start: "2026-08-09", end: "2026-12-31", horizonZh: "2026-08-09至12-31",
    primary: "乾为天（六冲）", changed: "水天需（游魂）", direction: "neutral", confidence: 64,
    titleZh: "标普500至年底：前段仍有强势，后段转等待整理",
    summaryZh: "乾六冲说明前段仍有强势与高波动，化需游魂后更强调等待、反复和消化；与十一月遁、十二月节相互印证，年底不是一路单边上涨。",
    thesisZh: ["前强后缓，不把乾卦机械理解成全年直线上涨。", "需与游魂提示后段等待和反复。"],
  }),
  record({
    id: "ORACLE-SPX-2027-20260809",
    assetId: "sp500", symbol: "SPX", start: "2027-01-01", end: "2027-12-31", horizonZh: "2027年",
    primary: "水地比（归魂）", changed: "地泽临", direction: "bullish", confidence: 69,
    titleZh: "标普500 2027：逐步走强，年度偏多",
    summaryZh: "比主聚合，临主接近与扩张；年度方向偏多，但归魂结构意味着过程仍会反复，不定义成直线牛市。",
    thesisZh: ["比：资金/力量重新聚合。", "临：由远及近、逐步推进，年度方向偏上。"], tags: ["annual"],
  }),
  record({
    id: "ORACLE-SPX-5Y-20260809",
    assetId: "sp500", symbol: "SPX", start: "2026-08-09", end: "2031-08-09", horizonZh: "未来5年",
    primary: "兑为泽（六冲）", changed: "泽雷随（归魂）", direction: "slightly-bullish", confidence: 58,
    titleZh: "标普500五年：长期偏上，但大波段反复",
    summaryZh: "兑六冲决定长期波动不会小，化随说明顺势适应后仍有向上空间。只作为长期背景，不参与日周方向。",
    thesisZh: ["六冲：长期波段回撤不可忽视。", "随：顺势而行，长期仍偏正向。"], tags: ["long-range"],
  }),
  record({
    id: "ORACLE-NDX-OCT-20260809",
    assetId: "nasdaq-100", symbol: "NDX", start: "2026-10-01", end: "2026-10-31", horizonZh: "2026年10月",
    primary: "地雷复（六合）", changed: "水雷屯", direction: "slightly-bullish", confidence: 65,
    titleZh: "纳指十月：有修复，但推进不顺",
    summaryZh: "复六合给出回归修复，化屯说明修复途中阻力很大。正式偏多，但不是顺滑主升。",
    thesisZh: ["复：方向先看修复回归。", "屯：启动艰难，涨势容易反复。"],
  }),
  record({
    id: "ORACLE-NDX-NOV-20260809",
    assetId: "nasdaq-100", symbol: "NDX", start: "2026-11-01", end: "2026-11-30", horizonZh: "2026年11月",
    primary: "泽地萃", changed: "地水师（归魂）", direction: "bearish", confidence: 69,
    titleZh: "纳指十一月：拥挤后转冲突，正式看跌",
    summaryZh: "萃先表现拥挤聚集，化师归魂后进入纪律、冲突与重新编队。对高估值科技更偏兑现和回撤。",
    thesisZh: ["萃：筹码和注意力高度集中。", "师：聚集之后转入冲突/整队，方向偏弱。"],
  }),
  record({
    id: "ORACLE-NDX-DEC-20260809",
    assetId: "nasdaq-100", symbol: "NDX", start: "2026-12-01", end: "2026-12-31", horizonZh: "2026年12月",
    primary: "水雷屯", changed: "水地比（归魂）", direction: "slightly-bullish", confidence: 63,
    titleZh: "纳指十二月：先难后聚，偏修复",
    summaryZh: "屯先难、比后聚，十二月更像低位困难后逐渐重新聚合。正式偏多，但强度不高。",
    thesisZh: ["屯：月初推进困难。", "比：后段重新聚合，利于修复。"],
  }),
  record({
    id: "ORACLE-NDX-H2-TO-DEC31-20260809",
    assetId: "nasdaq-100", symbol: "NDX", start: "2026-08-09", end: "2026-12-31", horizonZh: "2026-08-09至12-31",
    primary: "风山渐（归魂）", changed: "天山遁", direction: "slightly-bearish", confidence: 67,
    titleZh: "纳指至年底：先渐进、后退避，后段偏弱",
    summaryZh: "渐说明前段仍能缓慢推进，最终化遁则把年底主线拉回退避。与十一月看跌形成同向提示。",
    thesisZh: ["渐：不是立刻崩，前段仍可能缓慢上行。", "遁：后段退避更明确，年底整体偏弱。"],
  }),
  record({
    id: "ORACLE-NDX-2027-FIRST-20260809",
    assetId: "nasdaq-100", symbol: "NDX", start: "2027-01-01", end: "2027-12-31", horizonZh: "2027年（首次起卦）",
    primary: "地水师（归魂）", changed: "雷泽归妹（归魂）", direction: "neutral", confidence: 55,
    titleZh: "纳指2027首次卦：结构复杂，暂不硬给多空",
    summaryZh: "师化归妹且两边归魂，结构冲突和错配明显。按严格法先记方向不明确，等待后续跨周期证据。",
    thesisZh: ["首次起卦作为正式年度样本保留。", "归魂叠加使方向稳定性不足。"], tags: ["annual"],
  }),
  record({
    id: "ORACLE-NDX-2027-DUPLICATE-20260809",
    assetId: "nasdaq-100", symbol: "NDX", start: "2027-01-01", end: "2027-12-31", horizonZh: "2027年（1分钟内重复起卦，仅留档）",
    primary: "泽火革（静卦）", direction: "neutral", confidence: 35, consensusEligible: false, humanReviewStatus: "pending-review",
    titleZh: "纳指2027重复起卦：只留档，不参与共振",
    summaryZh: "同一问题在一分钟内重复起卦。按传统‘初筮告’与MOOX防挑卦原则，第二卦不得拿来覆盖第一次，只作为审计留档。革卦只提示年度可能有大变化，不给方向票。",
    thesisZh: ["不允许用第二次起卦挑选更喜欢的答案。", "不进入正式年度方向共振与准确率。"], tags: ["annual", "duplicate-cast", "audit-only"],
  }),
  record({
    id: "ORACLE-NDX-5Y-20260809",
    assetId: "nasdaq-100", symbol: "NDX", start: "2026-08-09", end: "2031-08-09", horizonZh: "未来5年",
    primary: "乾为天（六冲）", changed: "火天大有（归魂）", direction: "bullish", confidence: 68,
    titleZh: "纳指五年：长期看涨，但回撤会很深",
    summaryZh: "乾化大有给出长期增长和成果扩张，但六冲/归魂意味着中间会有大幅波段回撤。只作为长期背景，不参与短线执行。",
    thesisZh: ["乾：长期增长动能强。", "大有：成果与资产扩张倾向。", "六冲/归魂：不允许把长期看涨理解成直线。"], tags: ["long-range"],
  }),
];

export type UsIndexCycleAdminRow = {
  id: string;
  assetId: string;
  horizon: "MONTH";
  periodStart: string;
  periodEnd: string;
  direction: string;
  path: string;
  probabilityLabel: string;
  sourceLabel: string;
  status: string;
  version: number;
};

/** New month rows for admin full-cycle view. These are metaphysical directions, not statistical probabilities. */
export const US_INDEX_CYCLE_ADMIN_ROWS_20260809: UsIndexCycleAdminRow[] = [
  { id: "SPX-MONTH-202610-V1", assetId: "sp500", horizon: "MONTH", periodStart: "2026-10-01", periodEnd: "2026-10-31", direction: "方向不明确", path: "火泽睽→乾为天六冲：分歧放大、波动增强，不硬判单边。", probabilityLabel: "玄学定向：不明确（非统计概率）", sourceLabel: "六爻：火泽睽→乾为天（六冲）", status: "published", version: 1 },
  { id: "SPX-MONTH-202611-V1", assetId: "sp500", horizon: "MONTH", periodStart: "2026-11-01", periodEnd: "2026-11-30", direction: "下跌", path: "水火既济→天山遁：阶段完成后退避，月内偏回撤。", probabilityLabel: "玄学定向：下跌（非统计概率）", sourceLabel: "六爻：水火既济→天山遁", status: "published", version: 1 },
  { id: "SPX-MONTH-202612-V1", assetId: "sp500", horizon: "MONTH", periodStart: "2026-12-01", periodEnd: "2026-12-31", direction: "震荡下跌", path: "坤六冲→节六合：先弱后收敛，偏空但不看连续崩落。", probabilityLabel: "玄学定向：偏空（非统计概率）", sourceLabel: "六爻：坤为地（六冲）→水泽节（六合）", status: "published", version: 1 },
  { id: "NDX-MONTH-202610-V1", assetId: "nasdaq-100", horizon: "MONTH", periodStart: "2026-10-01", periodEnd: "2026-10-31", direction: "震荡上涨", path: "地雷复六合→水雷屯：有修复方向，但推进艰难、反复多。", probabilityLabel: "玄学定向：偏多（非统计概率）", sourceLabel: "六爻：地雷复（六合）→水雷屯", status: "published", version: 1 },
  { id: "NDX-MONTH-202611-V1", assetId: "nasdaq-100", horizon: "MONTH", periodStart: "2026-11-01", periodEnd: "2026-11-30", direction: "下跌", path: "泽地萃→地水师归魂：拥挤后转冲突与整队，偏兑现回撤。", probabilityLabel: "玄学定向：下跌（非统计概率）", sourceLabel: "六爻：泽地萃→地水师（归魂）", status: "published", version: 1 },
  { id: "NDX-MONTH-202612-V1", assetId: "nasdaq-100", horizon: "MONTH", periodStart: "2026-12-01", periodEnd: "2026-12-31", direction: "震荡上涨", path: "水雷屯→水地比归魂：月初困难，后段重新聚合修复。", probabilityLabel: "玄学定向：偏多（非统计概率）", sourceLabel: "六爻：水雷屯→水地比（归魂）", status: "published", version: 1 },
];
