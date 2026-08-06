/**
 * Forward weekly research for 2026-08-10 -> 2026-08-16.
 *
 * The Qimen weekly source is an overlay, not a standalone trading signal.
 * Direction influence is capped at 15% for covered markets and 20% for gold,
 * where the prior explicit Hai-day rebound window was recorded as a verified
 * source-timing sample. No future branch-day is invented when the source did
 * not provide one.
 */
import type { WeeklyAnalysisRecord, WeeklyBasisWeights } from "@/types/weekly-analysis";

const WEEK_START = "2026-08-10";
const WEEK_END = "2026-08-16";
const PUBLISHED_AT = "2026-08-06T21:10:00+08:00";

const STANDARD_BLEND: WeeklyBasisWeights = {
  technical: 30,
  liuyao: 30,
  cycle: 15,
  qimen: 15,
  macro: 5,
  bazi: 5,
  note: "奇门周度观点按15%方向权重参与融合，主要用于修正周内节奏与板块轮动；不得单独触发交易。",
};

const GOLD_BLEND: WeeklyBasisWeights = {
  technical: 25,
  liuyao: 30,
  cycle: 15,
  qimen: 20,
  macro: 5,
  bazi: 5,
  note: "黄金奇门方向权重临时提高至20%，只因8月5日亥日反弹窗口已有一条正式事前验证；样本仍少，不得继续上调。",
};

export const WEEKLY_RESEARCH_BLEND_NOTE_20260810 = {
  zh: "本期将吴昌烨老师的奇门周度观点作为辅助覆盖：普通覆盖资产占15%方向权重，黄金占20%；奇门对周内节奏和板块轮动的参考权重高于对长期方向的权重。老师原始窗口为8月10日至15日，网站周窗延伸到8月16日；8月16日的加密资产判断只属于MOOX技术与周期延伸，不归因于老师。其余方向仍由六爻、技术结构与周期共同决定。",
  en: "This edition uses Wu Changye's Qimen weekly view as a capped overlay: 15% directional influence for covered markets and 20% for gold. The source window is Aug 10–15; the site's Aug 16 crypto extension is MOOX technical/cycle work and is not attributed to the teacher. Qimen carries more influence on timing and rotation than on the long-range trend; Liu Yao, technical structure and cycle research remain primary.",
};

export const WEEKLY_SOURCE_VERIFICATION_NOTE_20260810 = {
  zh: "来源验证记录：老师此前明确指出黄金戌、亥日可能出现超大反弹；2026年8月5日亥日出现显著反弹。该结果只作为来源样本记录，不追溯修改已锁定的旧版MOOX预测。",
  en: "Source verification: the teacher had explicitly flagged Xu/Hai days for a potentially large gold rebound; a sharp rebound occurred on the Hai day of Aug 5, 2026. This is logged as a source sample and does not retroactively rewrite the locked MOOX forecast.",
};

export const PUBLISHED_WEEKLY_ANALYSES_20260810: WeeklyAnalysisRecord[] = [
  {
    id: "WEEKLY-BTC-20260810-V1",
    assetId: "bitcoin",
    assetName: "比特币",
    symbol: "BTC",
    displaySymbol: "BTC",
    weekStart: WEEK_START,
    weekEnd: WEEK_END,
    overallDirection: "先涨后跌",
    weeklyPath:
      "周初至周中仍可能延续反弹或扩大修复，但这轮反弹暂不定义为趋势反转。若上行无法形成连续放量和关键压力上方的稳定收盘，周后段更容易重新承压。奇门周度观点提供15%辅助权重，强化了‘反弹之后仍需防回落’的路径；执行仍以4小时技术确认和六爻主方向为准。",
    headline:
      "BTC下周可以反弹，但基准情景仍是反弹后承压；不要把一段修复直接当成新主升。",
    probabilities: { up: 34, flat: 28, down: 38 },
    strongWindow: "周初至周中的修复窗口",
    weakWindow: "反弹触及压力后、周后段的再承压窗口",
    keySupport: [],
    keyResistance: [],
    basisWeights: STANDARD_BLEND,
    invalidation:
      "若价格连续放量突破关键压力并在日线层面稳定站住，则‘先涨后跌’失效，应提高反转情景权重；若反弹尚未展开便直接破低，则路径提前转弱。",
    confirmation:
      "先出现4小时级别止跌与反弹，再观察压力区是否放量受阻；只有受阻并重新跌回短线结构下方，才确认周后段回落路径。",
    catalysts: ["超跌修复", "短线风险偏好回升", "奇门周度反弹提示"],
    risks: ["反弹不等于反转", "上涨后获利与套牢盘重新释放", "高波动下追涨止损困难"],
    riskLevel: "高",
    confidence: 63,
    publishedAt: PUBLISHED_AT,
    updatedAt: PUBLISHED_AT,
    status: "published",
    visibility: "member",
    sourceIds: [
      "MOOX-BTC-WEEKLY-MULTI-METHOD-20260810",
      "QIMEN-WUCHANGYE-WEEKLY-20260810",
    ],
    version: 1,
    originalLocked: true,
  },
  {
    id: "WEEKLY-SPX-20260810-V1",
    assetId: "sp500",
    assetName: "标普500",
    symbol: "SPX",
    displaySymbol: "SPX",
    weekStart: WEEK_START,
    weekEnd: WEEK_END,
    overallDirection: "震荡上涨",
    weeklyPath:
      "宽基指数仍有政策与资金托举，基准路径是回落、承接、再抬升，而不是直线拉升。奇门观点给出锯齿形上扬和逢跌观察机会；MOOX主体系仍保留高位分化与快速回吐风险，因此上调为震荡上涨，但不定义为强势单边。",
    headline:
      "标普下周偏向锯齿形上扬：回落后的承接质量，比追逐新高本身更重要。",
    probabilities: { up: 46, flat: 34, down: 20 },
    strongWindow: "回踩不破后的再上行窗口",
    weakWindow: "快速创新高后的短线回吐",
    keySupport: [],
    keyResistance: [],
    basisWeights: STANDARD_BLEND,
    invalidation:
      "若回落后失去承接并连续跌破周线短期结构，则震荡上涨失效；若直接持续放量上行，则路径会从锯齿形升级为趋势上行。",
    confirmation:
      "回踩时成交未失控、市场宽度没有同步恶化，并重新收复短线压力，才确认再上行。",
    catalysts: ["政策托举", "宽基资金承接", "非科技板块的均值回归"],
    risks: ["高位波动", "板块分化", "新高后的快速兑现"],
    riskLevel: "中高",
    confidence: 66,
    publishedAt: PUBLISHED_AT,
    updatedAt: PUBLISHED_AT,
    status: "published",
    visibility: "member",
    sourceIds: [
      "MOOX-SPX-WEEKLY-MULTI-METHOD-20260810",
      "QIMEN-WUCHANGYE-WEEKLY-20260810",
    ],
    version: 1,
    originalLocked: true,
  },
  {
    id: "WEEKLY-NDX-20260810-V1",
    assetId: "nasdaq-100",
    assetName: "纳斯达克100",
    symbol: "NDX",
    displaySymbol: "NDX",
    weekStart: WEEK_START,
    weekEnd: WEEK_END,
    overallDirection: "探底回升",
    weeklyPath:
      "科技股仍有超跌修复条件，但资金不一定继续像前期那样高度集中在科技。基准路径是先震荡或回踩，再出现修复；修复到一定位置后，资金可能向宽基、价值和非科技板块分流。",
    headline:
      "纳指下周看修复，不看全面主升；反弹高度取决于资金是否重新集中回科技。",
    probabilities: { up: 38, flat: 39, down: 23 },
    strongWindow: "回踩后的超跌修复阶段",
    weakWindow: "修复后资金分流与高估值兑现阶段",
    keySupport: [],
    keyResistance: [],
    basisWeights: STANDARD_BLEND,
    invalidation:
      "若科技龙头重新形成全面放量共振并持续领涨，‘修复后分流’路径失效；若回踩阶段直接放量破位，则探底回升失效。",
    confirmation:
      "费城半导体和主要AI权重股停止创新低，并在回踩后重新收复短线结构，才确认修复。",
    catalysts: ["科技股超跌修复", "AI与半导体情绪回暖"],
    risks: ["资金转向非科技板块", "财报后预期兑现", "高估值压缩"],
    riskLevel: "高",
    confidence: 61,
    publishedAt: PUBLISHED_AT,
    updatedAt: PUBLISHED_AT,
    status: "published",
    visibility: "member",
    sourceIds: [
      "MOOX-NDX-WEEKLY-MULTI-METHOD-20260810",
      "QIMEN-WUCHANGYE-WEEKLY-20260810",
    ],
    version: 1,
    originalLocked: true,
  },
  {
    id: "WEEKLY-SHCOMP-20260810-V1",
    assetId: "shanghai-composite",
    assetName: "上证指数",
    symbol: "000001.SS",
    displaySymbol: "SHCOMP",
    weekStart: WEEK_START,
    weekEnd: WEEK_END,
    overallDirection: "震荡上涨",
    weeklyPath:
      "下周更可能出现温和上行与快速轮动并存：指数涨幅未必很大，但个股赚钱效应可能好于指数。资金在科技、价值与低位板块之间切换较快，不适合把单日热点当成整周主线。",
    headline:
      "上证下周谨慎看多：指数温和、轮动很快，赚钱效应更可能来自板块切换。",
    probabilities: { up: 42, flat: 40, down: 18 },
    strongWindow: "轮动中的低位补涨与回踩承接窗口",
    weakWindow: "单一热点加速后的一致性兑现",
    keySupport: [],
    keyResistance: [],
    basisWeights: STANDARD_BLEND,
    invalidation:
      "若指数放量跌破短期平台且大多数板块同步走弱，则谨慎看多失效；若成交持续放大并形成主线共振，可提高上涨概率。",
    confirmation:
      "指数保持平台、市场上涨家数和轮动宽度改善，且回踩后仍有承接，才确认震荡上涨。",
    catalysts: ["政策关注", "低位板块均值回归", "板块轮动扩散"],
    risks: ["资金过度分散", "热点持续性差", "指数涨幅弱于个股感受"],
    riskLevel: "中高",
    confidence: 63,
    publishedAt: PUBLISHED_AT,
    updatedAt: PUBLISHED_AT,
    status: "published",
    visibility: "member",
    sourceIds: [
      "MOOX-SHCOMP-WEEKLY-MULTI-METHOD-20260810",
      "QIMEN-WUCHANGYE-WEEKLY-20260810",
    ],
    version: 1,
    originalLocked: true,
  },
  {
    id: "WEEKLY-HSTECH-20260810-V1",
    assetId: "hang-seng",
    assetName: "恒生科技",
    symbol: "HSTECH",
    displaySymbol: "HSTECH",
    weekStart: WEEK_START,
    weekEnd: WEEK_END,
    overallDirection: "震荡上涨",
    weeklyPath:
      "指数仍有一定做多空间，但更适合观察个股而不是押注指数单边。资金可能分散，指数需要通过震荡消化前期波动；回踩后仍能保持承接，才有继续上扬的条件。",
    headline:
      "恒生科技下周谨慎偏多，但个股机会大于指数机会，追涨指数的性价比一般。",
    probabilities: { up: 39, flat: 41, down: 20 },
    strongWindow: "回踩后的个股修复与轮动窗口",
    weakWindow: "指数冲高后缺少增量资金的回吐窗口",
    keySupport: [],
    keyResistance: [],
    basisWeights: STANDARD_BLEND,
    invalidation:
      "若指数和主要权重股同步失守短期结构，则震荡上涨失效；若成交放大且权重与个股同步突破，则可提高上行情景。",
    confirmation:
      "指数回踩不破、个股广度改善，并重新站回短线压力，才确认偏多路径。",
    catalysts: ["个股轮动", "风险偏好修复", "低位科技与互联网补涨"],
    risks: ["资金分散", "指数需要消化", "个股与指数表现脱节"],
    riskLevel: "高",
    confidence: 60,
    publishedAt: PUBLISHED_AT,
    updatedAt: PUBLISHED_AT,
    status: "published",
    visibility: "member",
    sourceIds: [
      "MOOX-HSTECH-WEEKLY-MULTI-METHOD-20260810",
      "QIMEN-WUCHANGYE-WEEKLY-20260810",
    ],
    version: 1,
    originalLocked: true,
  },
  {
    id: "WEEKLY-GOLD-20260810-V1",
    assetId: "gold",
    assetName: "国际金价",
    symbol: "GOLD",
    displaySymbol: "GC",
    weekStart: WEEK_START,
    weekEnd: WEEK_END,
    overallDirection: "震荡上涨",
    weeklyPath:
      "黄金的震荡中枢正在上移，基准路径是回落消化后再次挑战上方压力，而不是重新回到此前的低中枢。4000至4100附近继续视为中枢和偏多观察区；4300附近需要有效突破确认，后续可观察4300至4400区域。奇门方向权重提高到20%，但仍必须服从技术确认。",
    headline:
      "黄金下周中枢上移、谨慎看多；重点不是追涨，而是观察回落后能否再次挑战4300。",
    probabilities: { up: 50, flat: 35, down: 15 },
    strongWindow: "回落至中枢并出现承接后的再上攻窗口",
    weakWindow: "4300附近冲高但无法稳定站住的回吐窗口",
    keySupport: ["4,000–4,100（中枢与回落观察区）", "4,050附近（需K线确认）"],
    keyResistance: ["4,300", "4,400附近"],
    basisWeights: GOLD_BLEND,
    invalidation:
      "若黄金有效跌破4000并连续收在其下，中枢上移判断失效；若稳定站上4300，则震荡上涨可能升级为更强的上行结构。",
    confirmation:
      "回落至中枢附近出现止跌、成交承接并重新站回4200；突破4300必须是稳定收盘确认，不把短暂冲高当成突破。",
    catalysts: ["震荡中枢上移", "开门与金水结构偏利多", "前期亥日反弹形成的承接记忆"],
    risks: ["8月行情持续性偏差，获利需分段落袋", "4300附近假突破", "单次奇门命中样本不足"],
    riskLevel: "高",
    confidence: 68,
    publishedAt: PUBLISHED_AT,
    updatedAt: PUBLISHED_AT,
    status: "published",
    visibility: "member",
    sourceIds: [
      "MOOX-GOLD-WEEKLY-MULTI-METHOD-20260810",
      "QIMEN-WUCHANGYE-WEEKLY-20260810",
      "QIMEN-GOLD-HAI-20260805-VERIFIED-SOURCE-SAMPLE",
    ],
    version: 1,
    originalLocked: true,
  },
];
