/**
 * MOOX V7.20.10.9 — 2026-08-24 → 2026-08-30 weekly edition.
 *
 * Qimen calibration source: user-supplied Wu Changye weekly video for 8/24–8/29,
 * recorded 2026-08-20 10:00 Asia/Shanghai.  Liuyao rows were already locked
 * before the target week.  Technical analysis has zero directional vote.
 *
 * IMPORTANT: the teacher did NOT publish separate calls for ETH / NDX / SILVER / WTI
 * in this source. Those rows keep their locked Liuyao weekly path and are not
 * mislabeled as teacher-confirmed Qimen calls.
 */
import type { WeeklyAnalysisRecord, WeeklyBasisWeights, WeeklyKeyDate } from "@/types/weekly-analysis";

const WEEK_START = "2026-08-24";
const WEEK_END = "2026-08-30";
const PUBLISHED_AT = "2026-08-20T19:29:00+08:00";

const QIMEN_RISK_WINDOWS: WeeklyKeyDate[] = [
  {
    date: "2026-08-26",
    label: "庚午日·托底/救市可能窗口",
    expectedEffect: "企稳",
    sources: ["QIMEN"],
    confidence: 58,
    note: "吴老师将寅午戌日定义为可能出现救市/托底动作的窗口；只增加修复分支，不保证当日上涨。",
  },
  {
    date: "2026-08-27",
    label: "辛未日·下跌/小黑天鹅风险窗口",
    expectedEffect: "波动放大",
    sources: ["QIMEN"],
    confidence: 62,
    note: "吴老师将亥卯未日定义为下跌或小黑天鹅风险窗口；只提高风险等级，不保证当日收跌。",
  },
];

function qimenFirstBasis(note: string): WeeklyBasisWeights {
  return { technical: 0, liuyao: 25, cycle: 5, qimen: 60, macro: 10, bazi: 0, note };
}

function liuyaoOnlyBasis(note: string): WeeklyBasisWeights {
  return { technical: 0, liuyao: 80, cycle: 20, qimen: 0, macro: 0, bazi: 0, note };
}

export const WEEKLY_RESEARCH_BLEND_NOTE_20260824 = {
  zh: "本周新增吴老师2026年8月20日10:00起局的8月24日至29日奇门周盘校准。老师明确覆盖的资产以奇门为第一周度背景，六爻负责路径、确认和风险；未被老师单列的ETH、纳指、白银、WTI继续使用此前锁定六爻，不冒充老师已给结论。概率为MOOX编辑归一化，不是老师原始概率。",
  en: "This edition adds Wu's Qimen weekly calibration for Aug 24–29, cast at 10:00 on Aug 20. Where the teacher made an explicit asset call, Qimen is the primary weekly regime and Liu Yao supplies path/risk confirmation. ETH, NDX, silver and WTI were not separately called in this source and therefore keep their pre-locked Liu Yao path. Probabilities are MOOX editorial normalization, not teacher-stated odds.",
} as const;

export const WEEKLY_SOURCE_VERIFICATION_NOTE_20260824 = {
  zh: "来源边界：排盘结构已与老师白板逐宫核对，MOOX排盘本身一致；本次修正集中在解释层——对象用神、格局、泄耗受克、波动/尾部风险/托底分轴，以及‘未知路径不得补写’。老师周盘覆盖8月24日至29日；8月30日的7×24资产仍由已锁定周卦与当日日盘处理。",
  en: "Source boundary: the MOOX chart layout matches the teacher's board; this revision targets interpretation rather than chart construction. It adds explicit object anchors, combination semantics, strength/leakage, separate volatility/tail-risk/support axes, and an unknown-path rule. The teacher's weekly source covers Aug 24–29; Aug 30 for 24/7 assets remains governed by locked weekly research and the daily Qimen chart.",
} as const;

export const PUBLISHED_WEEKLY_ANALYSES_20260824: WeeklyAnalysisRecord[] = [
  {
    id: "WEEKLY-BTC-20260824-V3",
    assetId: "bitcoin", assetName: "比特币", symbol: "BTC", displaySymbol: "BTC",
    weekStart: WEEK_START, weekEnd: WEEK_END,
    overallDirection: "震荡",
    weeklyPath: "奇门先判为高波动盘整与多空分化，并明确保留‘某一天可能暴跌’的尾部风险；老师没有判断是先上冲再跌还是直接跌，因此不补写顺序。六爻则允许风险释放后出现企稳或弱修复，两者合并为：先防急跌尾险，风险释放后再看修复，不把反弹定义为新主升。",
    headline: "BTC下周不是舒服的单边：高波动盘整中保留单日急跌尾险，路径先后未知。",
    probabilities: { up: 25, flat: 40, down: 35 },
    strongWindow: "若急跌风险先兑现，随后5分钟/30分钟结构完成止跌时再评估修复",
    weakWindow: "多空分化扩大、壬加辛盘整结束后的急跌风险段",
    keyDates: QIMEN_RISK_WINDOWS,
    basisWeights: qimenFirstBasis("吴老师：BTC取戊+壬；壬加辛、九地、天柱对应窄幅盘整与后续分化，并明确提示单日暴跌尾险。六爻W4：财连续但父母持世，风险释放后可弱修复。"),
    keySupport: [], keyResistance: [],
    invalidation: "若整周持续稳定抬高且回踩不破、并未出现波动放大，则‘急跌尾险’仅记为未兑现，不事后改写；反之单次急跌也不自动证明后续一定继续单边下行。",
    confirmation: "短线执行仍须4H环境→30分钟主线段→5分钟右侧买卖点确认；奇门尾险不直接触发实盘。",
    catalysts: ["急跌后的空头回补/修复", "托底窗口可能带来的快速反抽"],
    risks: ["壬加辛多空分化", "九地+天柱盘整后尾部风险", "老师明确路径顺序未知"],
    riskLevel: "高", confidence: 66,
    publishedAt: PUBLISHED_AT, updatedAt: PUBLISHED_AT, status: "published", visibility: "member",
    sourceIds: ["WU-QIMEN-WEEK-20260824-BTC", "BTC-W4-20260824-V2"], version: 3, originalLocked: true,
  },
  {
    id: "WEEKLY-ETH-20260824-V2",
    assetId: "eth", assetName: "以太坊", symbol: "ETH", displaySymbol: "ETH",
    weekStart: WEEK_START, weekEnd: WEEK_END,
    overallDirection: "探底回升",
    weeklyPath: "本期吴老师没有单列ETH，禁止用BTC结论替代ETH。沿用已锁定六爻：先震荡或下探，官鬼风险释放后化财，随后具备回升条件；若直接急涨，也更容易转入高位整理。",
    headline: "ETH保持独立判断：先处理风险，再看修复；不因BTC尾险自动取消ETH多头机会。",
    probabilities: { up: 43, flat: 34, down: 23 },
    strongWindow: "下探后结构止跌、重新站回30分钟关键结构时",
    weakWindow: "官鬼风险先动、市场剧烈震荡阶段",
    basisWeights: liuyaoOnlyBasis("吴老师本期未单列ETH；周度方向只沿用此前锁定火雷噬嗑→山雷颐六爻，日度仍由ETH自身奇门独立判断。"),
    keySupport: [], keyResistance: [],
    invalidation: "若持续破低且风险释放后仍没有承接，探底回升失效。",
    confirmation: "ETH自己的奇门与30分钟/5分钟结构拥有独立执行权；BTC只能影响风险缩放，不能一票否决。",
    catalysts: ["官鬼化财", "财爻持世"], risks: ["风险先动", "急涨后的高位整理"],
    riskLevel: "高", confidence: 66,
    publishedAt: PUBLISHED_AT, updatedAt: PUBLISHED_AT, status: "published", visibility: "member",
    sourceIds: ["ETH-W4-20260824-V1"], version: 2, originalLocked: true,
  },
  {
    id: "WEEKLY-SPX-20260824-V2",
    assetId: "sp500", assetName: "标普500", symbol: "SPX", displaySymbol: "SPX",
    weekStart: WEEK_START, weekEnd: WEEK_END,
    overallDirection: "震荡",
    weeklyPath: "奇门丁火居中，乙加丁存在修复分支，但转坎又受水克；老师明确描述为‘超级大的分化行情’，不是单边。六爻同期是财化兄的冲高兑现结构，因此上涨出现时更要防快速回吐。",
    headline: "标普下周高波动分化：能修复，但冲高后兑现风险同步存在。",
    probabilities: { up: 28, flat: 42, down: 30 },
    strongWindow: "修复分支兑现、权重股与市场宽度同步改善时",
    weakWindow: "冲高后财化兄兑现或坎水压丁的回落分支",
    keyDates: QIMEN_RISK_WINDOWS,
    basisWeights: qimenFirstBasis("奇门：丁火居中，乙加丁可修复、转坎受克；老师定义为超级大分化。六爻：8/24-30财化兄，偏冲高回落。"),
    keySupport: [], keyResistance: [],
    invalidation: "若市场宽度与权重持续同步单边上行且波动明显收敛，则高分化判断失效。",
    confirmation: "技术只确认哪一条分支正在兑现，不反向修改周度奇门状态。",
    catalysts: ["乙加丁修复分支", "托底/救市窗口"], risks: ["坎水压丁", "财化兄兑现", "大格高波动"],
    riskLevel: "高", confidence: 70,
    publishedAt: PUBLISHED_AT, updatedAt: PUBLISHED_AT, status: "published", visibility: "member",
    sourceIds: ["WU-QIMEN-WEEK-20260824-SPX", "ORACLE-SPX-AUG-20260801"], version: 2, originalLocked: true,
  },
  {
    id: "WEEKLY-NDX-20260824-V2",
    assetId: "nasdaq-100", assetName: "纳斯达克100", symbol: "NDX", displaySymbol: "NDX",
    weekStart: WEEK_START, weekEnd: WEEK_END,
    overallDirection: "探底回升",
    weeklyPath: "吴老师本期只给美股整体丙加壬的锯齿高波动背景，没有单列纳指专属结论。纳指周度仍按已锁定六爻：伏财显出、兄弟化财，风险释放后有修复；同时接受美股整体大波动风险约束。",
    headline: "纳指周度仍看风险后修复，但必须服从美股整体锯齿高波动环境。",
    probabilities: { up: 36, flat: 39, down: 25 },
    strongWindow: "风险释放并出现完整反转结构后",
    weakWindow: "美股整体多空加剧、科技权重共振下压时",
    basisWeights: liuyaoOnlyBasis("本期吴老师未单列NDX，禁止把美股丙火直接冒充纳指专属口诀；六爻8/24-30为伏财显出后的探底回升。"),
    keySupport: [], keyResistance: [],
    invalidation: "若风险释放后继续持续创新低，则探底回升失效。",
    confirmation: "先等30分钟/5分钟完成右侧止跌，不因六爻写‘回升’提前抄底。",
    catalysts: ["伏财显出", "风险释放后修复"], risks: ["美股整体丙加壬锯齿", "AI/流动性风险"],
    riskLevel: "高", confidence: 64,
    publishedAt: PUBLISHED_AT, updatedAt: PUBLISHED_AT, status: "published", visibility: "member",
    sourceIds: ["ORACLE-NDX-AUG-20260801", "WU-QIMEN-WEEK-20260824-US-BROAD"], version: 2, originalLocked: true,
  },
  {
    id: "WEEKLY-SHCOMP-20260824-V2",
    assetId: "shanghai-composite", assetName: "上证指数", symbol: "000001.SS", displaySymbol: "SHCOMP",
    weekStart: WEEK_START, weekEnd: WEEK_END,
    overallDirection: "震荡",
    weeklyPath: "本期纠正对象用神：A股先看己土，不再把庚金当第一对象。己土上临白虎天蓬对应4000附近上方承压，老师同时看到下方国家队托底，故主状态是宽幅震荡。六爻财土显出仍允许震荡中偏修复，但不能发布成强多。",
    headline: "上证下周宽幅震荡：上方承压、下方有托底，六爻只提供轻微修复偏置。",
    probabilities: { up: 34, flat: 46, down: 20 },
    strongWindow: "下探后托底有效、市场宽度恢复时",
    weakWindow: "接近4000压力区或全球风险同步放大时",
    keyDates: QIMEN_RISK_WINDOWS,
    basisWeights: qimenFirstBasis("奇门最新老师锚点：A股=己土为主、庚为辅；白虎天蓬上压+下方托底=>宽幅震荡。六爻8/24-30财土显出，提供修复偏置。"),
    keySupport: [], keyResistance: [],
    invalidation: "若突破压力后市场宽度持续扩张并稳定站住，宽幅震荡上限判断失效；若托底失效则下行风险升级。",
    confirmation: "1H只负责把老师的‘压力/托底’转换为真实价格区，禁止用卦象凭空生成点位。",
    catalysts: ["国家队/政策托底", "财土显出"], risks: ["4000附近上方承压", "白虎高压", "全球三项流动性风险"],
    riskLevel: "高", confidence: 72,
    publishedAt: PUBLISHED_AT, updatedAt: PUBLISHED_AT, status: "published", visibility: "member",
    sourceIds: ["WU-QIMEN-WEEK-20260824-SHCOMP", "ORACLE-SHCOMP-AUG-20260801-V2"], version: 2, originalLocked: true,
  },
  {
    id: "WEEKLY-HSTECH-20260824-V2",
    assetId: "hang-seng", assetName: "恒生科技", symbol: "HSTECH", displaySymbol: "HSTECH",
    weekStart: WEEK_START, weekEnd: WEEK_END,
    overallDirection: "震荡下跌",
    weeklyPath: "奇门最新明确以庚金为对象，庚下临癸被老师解释为泄气，短线可能轻微向下调整；同时老师明确长期大方向仍看多。六爻同期为震荡整理，因此合并为短线震荡偏弱，而不是长期转空。",
    headline: "恒科下周轻微偏弱：庚下临癸泄气，短线回调不改变长期多头背景。",
    probabilities: { up: 25, flat: 43, down: 32 },
    strongWindow: "回调完成且重新出现结构承接时",
    weakWindow: "庚金泄气对应的短线下调阶段",
    keyDates: QIMEN_RISK_WINDOWS,
    basisWeights: qimenFirstBasis("奇门：恒生科技=庚，庚下临癸泄气=>短线轻微向下。六爻：8/24-30资金仍在但偏整理。"),
    keySupport: [], keyResistance: [],
    invalidation: "若短线不回调反而持续放量走强，则本周轻微偏弱未兑现；不得因此改写老师原预测。",
    confirmation: "等待真实1H/30分钟结构确认回调幅度；长期方向与短线周度分开。",
    catalysts: ["回调后的结构修复"], risks: ["庚下临癸泄气", "全球风险传导"],
    riskLevel: "中高", confidence: 68,
    publishedAt: PUBLISHED_AT, updatedAt: PUBLISHED_AT, status: "published", visibility: "member",
    sourceIds: ["WU-QIMEN-WEEK-20260824-HSTECH", "ORACLE-HSTECH-AUG-20260801"], version: 2, originalLocked: true,
  },
  {
    id: "WEEKLY-GOLD-20260824-V2",
    assetId: "gold", assetName: "国际金价", symbol: "GLD", displaySymbol: "GC",
    weekStart: WEEK_START, weekEnd: WEEK_END,
    overallDirection: "下跌",
    weeklyPath: "奇门与六爻在本周形成同向：辛金能量不足且落离宫受火克，老师判断近期小回调；六爻8/24-30又是财化兄回头克的月末最弱窗口。方向偏下，但奇门强调‘小回调’，因此不把幅度夸大成趋势崩跌。",
    headline: "黄金下周偏回调：奇门辛金受克与六爻财化兄同向，幅度仍按‘小回调’约束。",
    probabilities: { up: 20, flat: 28, down: 52 },
    strongWindow: "回调完成后、长期配置重新寻找承接的位置",
    weakWindow: "辛金受克与财化兄同时兑现的月末压力段",
    keyDates: QIMEN_RISK_WINDOWS,
    basisWeights: qimenFirstBasis("奇门：黄金=辛，辛落离宫受克=>小回调；六爻：8/24-30财化兄回头克=>月末最弱。两法同向。"),
    keySupport: [], keyResistance: [],
    invalidation: "若持续创新高且没有周内回调，记录为本周回调预测未兑现，不事后改判。",
    confirmation: "技术只负责判断回调是否已经完成以及重新入场位置。",
    catalysts: ["回调后的长线配置需求"], risks: ["辛金离宫受克", "财化兄回头克"],
    riskLevel: "高", confidence: 78,
    publishedAt: PUBLISHED_AT, updatedAt: PUBLISHED_AT, status: "published", visibility: "member",
    sourceIds: ["WU-QIMEN-WEEK-20260824-GOLD", "ORACLE-GOLD-AUG-20260801-V2"], version: 2, originalLocked: true,
  },
  {
    id: "WEEKLY-SILVER-20260824-V1",
    assetId: "silver", assetName: "国际银价", symbol: "SILVER", displaySymbol: "SI",
    weekStart: WEEK_START, weekEnd: WEEK_END,
    overallDirection: "先涨后跌",
    weeklyPath: "本期吴老师没有单列白银，继续使用8月2日已经锁定的精确周卦：前段延续修复，后段分歧和回撤风险上升；六冲背景意味着上涨和回撤速度都可能较快。",
    headline: "白银沿用已锁定周卦：前段修复、后段防冲高回落。",
    probabilities: { up: 34, flat: 34, down: 32 },
    strongWindow: "周前段延续修复阶段", weakWindow: "周后段分歧和回撤风险放大阶段",
    basisWeights: liuyaoOnlyBasis("吴老师本期未单列白银；使用2026-08-02已锁定8/24-30周卦，不把黄金奇门结论直接复制给白银。"),
    keySupport: [], keyResistance: [],
    invalidation: "若后段仍稳定加速上行且没有波动放大，则先涨后跌路径失效。",
    confirmation: "白银独立看自己的结构，不因黄金回调判断自动做空。",
    catalysts: ["前段修复延续"], risks: ["后段六冲高波动", "冲高后快速回撤"],
    riskLevel: "高", confidence: 62,
    publishedAt: PUBLISHED_AT, updatedAt: PUBLISHED_AT, status: "published", visibility: "member",
    sourceIds: ["silver:20260802:week-0824-0830"], version: 1, originalLocked: true,
  },
  {
    id: "WEEKLY-WTI-20260824-V1",
    assetId: "wti-crude", assetName: "WTI原油", symbol: "WTI", displaySymbol: "CL",
    weekStart: WEEK_START, weekEnd: WEEK_END,
    overallDirection: "探底回升",
    weeklyPath: "本期吴老师没有单列原油，继续使用已锁定六爻：前期下跌后具备阶段修复，但静卦六冲不支持稳定反转；中期油价偏弱背景不变。",
    headline: "WTI仅看下跌后的阶段修复，不确认趋势反转。",
    probabilities: { up: 30, flat: 42, down: 28 },
    strongWindow: "急跌后子孙申金生财子水的修复阶段", weakWindow: "中期兄弟金克财背景重新占优时",
    basisWeights: liuyaoOnlyBasis("吴老师本期未单列WTI；沿用8/24-30锁定六爻‘探底回升但非反转’。"),
    keySupport: [], keyResistance: [],
    invalidation: "若修复无法形成、继续持续破低，则探底回升失效。",
    confirmation: "技术确认修复，不用六爻生成固定油价点位。",
    catalysts: ["急跌后的阶段修复"], risks: ["中期下行背景", "六冲不支持稳定反转"],
    riskLevel: "高", confidence: 62,
    publishedAt: PUBLISHED_AT, updatedAt: PUBLISHED_AT, status: "published", visibility: "member",
    sourceIds: ["ORACLE-WTI-AUG-20260801"], version: 1, originalLocked: true,
  },
];
