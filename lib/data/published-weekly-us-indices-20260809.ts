/**
 * Pre-week US-index revision locked on 2026-08-09.
 *
 * Scope: SPX and NDX only. Existing V1/V2/V3 history remains untouched.
 * Direction doctrine: Liu Yao / cross-horizon metaphysical evidence determines
 * the formal direction. Technical analysis has zero direction vote and is used
 * only for execution levels/timing.
 */
import type { WeeklyAnalysisRecord, WeeklyBasisWeights } from "@/types/weekly-analysis";
import {
  ARCHIVED_WEEKLY_ANALYSES_20260810,
  PUBLISHED_WEEKLY_ANALYSES_20260810_V3,
} from "@/lib/data/published-weekly-revision-20260810";

const PUBLISHED_AT_V4 = "2026-08-09T13:52:00+08:00";

const US_INDEX_DIRECTION_BLEND: WeeklyBasisWeights = {
  technical: 0,
  liuyao: 75,
  cycle: 15,
  qimen: 10,
  macro: 0,
  bazi: 0,
  note: "正式方向仅由六爻与多周期玄学证据决定；技术分析方向票为0，只负责入场、点位与风险边界。外部六爻只做交叉验证，不覆盖MOOX自有卦。",
};

export const WEEKLY_RESEARCH_BLEND_NOTE_20260810_V4 = {
  zh: "V4于2026年8月9日、目标周开始前锁定。标普与纳指新增同周期六爻复核，并加入狼叔8/9公开六爻作为外部交叉验证。正式方向仍只由MOOX六爻与多周期玄学共振决定；技术分析只找点位，不拥有方向投票权。标普正式方向上调为上涨；纳指正式方向收口为下跌，周中反弹只属于路径，不改写整周方向。",
  en: "V4 was locked on Aug 9 before the target week. SPX and NDX received same-window Liu Yao reviews, with the Aug 9 public Wolf Liu Yao reading used only as an external cross-check. Formal direction remains determined by MOOX metaphysical evidence; technical analysis is restricted to execution and levels. SPX is formally bullish; NDX is formally bearish, with any midweek rebound treated as path rather than a direction reversal.",
};

export const WEEKLY_SOURCE_VERIFICATION_NOTE_20260810_V4 = {
  zh: "版本审计：SPX/NDX原V1完整保留并转入历史，V4集合只新增SPX V2与NDX V2。狼叔观点不作为技术方向票：SPY偏强、周五整理；QQQ周初下探、周二/周三反弹、周五再修正。MOOX不使用目标周结果事后改写，也不把K线条件反向改写玄学方向。",
  en: "Audit: original SPX/NDX V1 records are preserved as history; the V4 edition adds only SPX V2 and NDX V2. The Wolf view is not a technical direction vote: SPY is relatively stronger with a Friday fade, while QQQ dips early, rebounds Tue/Wed and corrects again Friday. MOOX does not rewrite the metaphysical direction from later chart action.",
};

const SPX_V2: WeeklyAnalysisRecord = {
  id: "WEEKLY-SPX-20260810-V2",
  assetId: "sp500",
  assetName: "标普500",
  symbol: "SPX",
  displaySymbol: "SPX",
  weekStart: "2026-08-10",
  weekEnd: "2026-08-16",
  overallDirection: "上涨",
  weeklyPath:
    "正式方向：上涨。周初仍可能先出现争议、回撤或冲高后的换手，但这只是路径；随后更有利于向上推进，周中强度优于周初。周五更容易出现获利回吐与整理，但不把周五回吐解释成整周转空。",
  headline:
    "标普500下周明确看涨：讼卦二、五爻动而化晋，申月财爻发动得令；8月中旬窗口、周卦与外部六爻形成同向验证，且相对纳指更强。",
  probabilities: { up: 60, flat: 26, down: 14 },
  strongWindow: "周二至周四的向上推进窗口",
  weakWindow: "周初争议/换手与周五获利回吐",
  keySupport: [],
  keyResistance: [],
  basisWeights: US_INDEX_DIRECTION_BLEND,
  invalidation:
    "本版本玄学方向已锁定，不因技术位跌破或突破而事后改写。若技术执行结构恶化，只暂停当下执行计划并等待新版本评估，不倒改本周‘上涨’记录。",
  confirmation:
    "技术只负责寻找更好的入场时机与风险边界，不参与‘上涨/下跌’方向投票。",
  catalysts: ["申月财爻得令", "讼九五元吉并化晋", "8月中旬月内强窗口", "SPY外部六爻相对强势校验"],
  risks: ["周初仍有讼象争议与换手", "周五容易整理回吐", "高位波动会放大日内回撤"],
  riskLevel: "中高",
  confidence: 79,
  publishedAt: PUBLISHED_AT_V4,
  updatedAt: PUBLISHED_AT_V4,
  status: "published",
  visibility: "member",
  sourceIds: [
    "ORACLE-SPX-WEEK-20260810-REVIEW-20260809",
    "MOOX-SPX-AUG-20260801",
    "MOOX-SPX-MULTICYCLE-20260809",
    "EXTERNAL-WOLF-SPY-WEEKLY-20260809",
  ],
  version: 2,
  originalLocked: true,
  revisions: [
    {
      version: 2,
      previousContent: "V1：震荡上涨，回落承接再抬升。",
      changedAt: PUBLISHED_AT_V4,
      reason: "目标周开始前补齐同周期六爻复核，并按MOOX‘玄学定方向’规则将路径词收口为唯一正式方向；未使用目标周结果。",
    },
  ],
};

const NDX_V2: WeeklyAnalysisRecord = {
  id: "WEEKLY-NDX-20260810-V2",
  assetId: "nasdaq-100",
  assetName: "纳斯达克100",
  symbol: "NDX",
  displaySymbol: "NDX",
  weekStart: "2026-08-10",
  weekEnd: "2026-08-16",
  overallDirection: "下跌",
  weeklyPath:
    "正式方向：下跌。周初压力最直接；周二或周三开始出现一段反弹修复，反弹可以延续到周后段，但它属于下跌周里的修复段，不把反弹改写成整周看涨；周五再防一次整理或回吐。",
  headline:
    "纳斯达克100下周明确看跌：财世午火在申月失令，子孙寅木发动但逢空并受申冲；8月月卦同样偏弱。狼叔对QQQ给出的‘周初下探—周中反弹—周五修正’与MOOX路径高度一致。",
  probabilities: { up: 22, flat: 29, down: 49 },
  strongWindow: "空头压力集中在周初，周五存在二次整理窗口",
  weakWindow: "周二/周三起的反弹修复段",
  keySupport: [],
  keyResistance: [],
  basisWeights: US_INDEX_DIRECTION_BLEND,
  invalidation:
    "本版本玄学方向已锁定，不因盘中反弹或技术突破而事后改成看涨。若技术执行条件不适合做空，只停止执行，不倒改本周‘下跌’记录；新卦形成后另开新版本。",
  confirmation:
    "技术只负责判断何时执行空头方向以及风险边界；周中反弹本身不是方向反转票。",
  catalysts: ["申月财世失令", "子孙寅木空且受申冲", "8月月卦偏弱", "QQQ外部六爻周初下探校验"],
  risks: ["周中反弹可能很快", "科技权重股日内波动大", "SPY相对偏强会限制纳指下跌斜率"],
  riskLevel: "高",
  confidence: 74,
  publishedAt: PUBLISHED_AT_V4,
  updatedAt: PUBLISHED_AT_V4,
  status: "published",
  visibility: "member",
  sourceIds: [
    "ORACLE-NDX-WEEK-20260808-REVIEW-20260809",
    "MOOX-NDX-AUG-20260801",
    "MOOX-NDX-MULTICYCLE-20260809",
    "EXTERNAL-WOLF-QQQ-WEEKLY-20260809",
  ],
  version: 2,
  originalLocked: true,
  revisions: [
    {
      version: 2,
      previousContent: "V1：探底回升，看修复，不看全面主升。",
      changedAt: PUBLISHED_AT_V4,
      reason: "目标周开始前结合申月旺衰、8月月卦与外部同周期六爻复核，将‘先跌后涨’路径与整周正式方向拆开；未使用目标周结果。",
    },
  ],
};

const CURRENT_WITHOUT_US = PUBLISHED_WEEKLY_ANALYSES_20260810_V3.filter(
  (item) => item.assetId !== "sp500" && item.assetId !== "nasdaq-100"
);
const PREVIOUS_US = PUBLISHED_WEEKLY_ANALYSES_20260810_V3.filter(
  (item) => item.assetId === "sp500" || item.assetId === "nasdaq-100"
);

export const ARCHIVED_WEEKLY_ANALYSES_20260810_V4: WeeklyAnalysisRecord[] = [
  ...ARCHIVED_WEEKLY_ANALYSES_20260810,
  ...PREVIOUS_US.map((item) => ({ ...item, status: "archived" as const, updatedAt: PUBLISHED_AT_V4 })),
];

export const PUBLISHED_WEEKLY_ANALYSES_20260810_V4: WeeklyAnalysisRecord[] = [
  ...CURRENT_WITHOUT_US,
  SPX_V2,
  NDX_V2,
];
