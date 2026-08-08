/**
 * MOOX weekly prediction data revision for 2026-08-10 -> 2026-08-16.
 *
 * V2 is locked before the target week begins. The original V1 source module is
 * intentionally left untouched. BTC and GOLD V1 are retained here as archived
 * audit snapshots; SPX/NDX/SHCOMP/HSTECH remain unchanged V1 records.
 * ETH and SILVER are newly published because the second Liu Yao source supplied
 * explicit week-specific paths. WTI remains unpublished.
 */
import type { WeeklyAnalysisRecord, WeeklyBasisWeights } from "@/types/weekly-analysis";

const WEEK_START = "2026-08-10";
const WEEK_END = "2026-08-16";
const PUBLISHED_AT = "2026-08-06T21:10:00+08:00";
const PUBLISHED_AT_V2 = "2026-08-08T09:55:00+08:00";

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

const NEW_SOURCE_BLEND: WeeklyBasisWeights = {
  technical: 30,
  liuyao: 40,
  cycle: 20,
  qimen: 0,
  macro: 5,
  bazi: 5,
  note: "ETH/白银本次因新增明确周卦而补齐。第二位老师只进入六爻内部交叉验证，不单独触发交易；同周期未取得专门奇门信号，因此奇门权重为0。技术价位缺失时不得编造。",
};

export const WEEKLY_RESEARCH_BLEND_NOTE_20260810_V2 = {
  zh: "V2于2026年8月8日、目标周开始前锁定。第二位六爻老师作为独立交叉验证源，只进入六爻方法内部，不额外抬高总方法权重，也不能单独触发交易。BTC与黄金不改主方向，只细化周内路径；ETH与白银因获得明确的同周期周卦首次补齐；WTI仍保持待发布。ETH的8月12日与8月15日属于老师明确标记的关键时间窗；黄金和白银只保留老师给出的日期区间，不把区间伪造成单日精确点。",
  en: "V2 was locked on Aug 8, 2026, before the target week. The second Liu Yao teacher is used only as an independent cross-check inside the Liu Yao method bucket; it does not raise the total method weight and cannot trigger trades alone. BTC and gold keep their primary directions with refined weekly paths. ETH and silver are newly filled because a week-specific source is now available. WTI remains pending. Aug 12 and Aug 15 are explicit ETH timing windows from the source; gold and silver keep range-based timing instead of inventing single-day precision.",
};

export const WEEKLY_SOURCE_VERIFICATION_NOTE_20260810_V2 = {
  zh: "版本审计：2026年8月6日V1原始文件不删除；BTC与黄金V1作为审计副本保留，V2在8月10日目标周开始前发布。第二位老师对白银提到的62属于结合K线的技术参考，不是卦象价格位，本次不写入正式支撑/压力，等待真实行情技术确认。此前奇门老师8月5日亥日黄金反弹样本仍只作为来源验证，不用于追溯改写旧预测。",
  en: "Version audit: the original Aug 6 V1 module is not deleted. BTC and gold V1 are retained as audit snapshots, while V2 is published before the Aug 10 target week. The silver 62 reference from the second teacher was explicitly a chart-based technical reference rather than a hexagram-derived level, so it is not published as formal support/resistance until real market data confirms it. The prior Aug 5 gold Qimen sample remains source verification only and does not rewrite history.",
};

const BASE_BTC_V1: WeeklyAnalysisRecord = {
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
  };

const BASE_SPX_V1: WeeklyAnalysisRecord = {
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
  };

const BASE_NDX_V1: WeeklyAnalysisRecord = {
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
  };

const BASE_SHCOMP_V1: WeeklyAnalysisRecord = {
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
  };

const BASE_HSTECH_V1: WeeklyAnalysisRecord = {
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
  };

const BASE_GOLD_V1: WeeklyAnalysisRecord = {
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
  };


const BTC_V2: WeeklyAnalysisRecord = {
  ...BASE_BTC_V1,
  id: "WEEKLY-BTC-20260810-V2",
  weeklyPath:
    "周初至周中仍允许修复反弹，但不把反弹定义为趋势反转。新增六爻交叉验证强调当前更像高频来回的‘猴市’：局部高点与低点可能在24至36小时内快速切换，上涨时追多、下跌时追空都容易被反向波动击中。基准情景仍是先修复、再观察压力；若反弹无法形成连续技术确认，周后段继续防承压回落。",
  headline:
    "BTC主方向不改：仍是先涨后跌；新增来源只强化‘快速反向、不要把修复当主升’的风险。",
  probabilities: { up: 34, flat: 28, down: 38 },
  strongWindow: "周初至周中的修复窗口；只在4小时级别止跌确认后提高反弹权重",
  weakWindow: "反弹后24–36小时快速反向风险，以及周后段压力重新释放",
  invalidation:
    "若价格连续放量突破关键压力并在日线层面稳定站住，则‘先涨后跌’失效，应提高趋势反转权重；若周初未出现修复便直接破低，则路径提前转弱。",
  confirmation:
    "先确认4小时止跌与反弹，再观察压力区是否稳定受阻；不因单根阳线追多，也不因单根阴线追空。",
  catalysts: ["超跌修复", "短线风险偏好回升", "第二六爻来源对快速反向结构的交叉验证"],
  risks: ["24–36小时内高低点快速切换", "反弹不等于反转", "追涨杀跌容易被双向扫损"],
  basisWeights: {
    ...BASE_BTC_V1.basisWeights!,
    note: "总方法权重不变。第二位老师只作为六爻30%内部的独立交叉验证源；方向仍由MOOX原有六爻、技术结构和周期共同决定。",
  },
  sourceIds: [
    ...(BASE_BTC_V1.sourceIds ?? []),
    "LIUYAO-TEACHER02-WEEKLY-20260810",
  ],
  publishedAt: PUBLISHED_AT_V2,
  updatedAt: PUBLISHED_AT_V2,
  version: 2,
  originalLocked: true,
  revisions: [
    {
      version: 1,
      previousContent: "V1方向=先涨后跌；路径=周初至周中修复，周后段再承压。",
      changedAt: PUBLISHED_AT_V2,
      reason: "新增第二位六爻老师的事前周度材料；主方向不改，只细化24–36小时快速反向风险。",
    },
  ],
};

const ETH_V1: WeeklyAnalysisRecord = {
  id: "WEEKLY-ETH-20260810-V1",
  assetId: "eth",
  assetName: "以太坊",
  symbol: "ETH",
  displaySymbol: "ETH",
  weekStart: WEEK_START,
  weekEnd: WEEK_END,
  overallDirection: "探底回升",
  weeklyPath:
    "8月10日至11日先看下探与低点形成，12日是老师明确标记的多头启动关键日；若技术结构同步止跌，12日至14日更容易进入渐进上升。15日是潜在阶段高点与变盘窗口，冲高后可能在15日至16日转为高位震荡或回落。整体不是单边主升，而是‘下探—上升—再震荡’的复合路径。",
  headline:
    "ETH下周基准路径：先探底、12日转强、15日前后防冲高回落；关键在时间窗与技术确认共振。",
  probabilities: { up: 46, flat: 34, down: 20 },
  strongWindow: "2026-08-12至2026-08-14：若12日完成止跌，逐步提高反弹与上行权重",
  weakWindow: "2026-08-10至2026-08-11低点窗口；2026-08-15至16日高位震荡/回落风险",
  keyDates: [
    {
      date: "2026-08-12",
      label: "多头启动关键日",
      expectedEffect: "上涨",
      sources: ["LIUYAO"],
      confidence: 68,
      note: "老师02明确标记；若盘口和4小时结构未确认，只视为时间窗口，不强行做多。",
    },
    {
      date: "2026-08-15",
      label: "阶段高点/冲高回落关键日",
      expectedEffect: "冲高回落",
      sources: ["LIUYAO"],
      confidence: 64,
      note: "可能在一天内完成冲高与回落；7×24市场周六仍属于正式观察日。",
    },
  ],
  basisWeights: NEW_SOURCE_BLEND,
  keySupport: [],
  keyResistance: [],
  invalidation:
    "若8月12日前后仍未形成止跌结构并继续放量破低，则探底回升路径失效；若15日后继续放量上破并稳定站住，则冲高回落风险下降。",
  confirmation:
    "必须等待真实行情确认：4小时止跌、短线结构抬高并重新收复压力后，才确认12日至14日的上升段；关键价位由实时K线生成，不由六爻给价。",
  catalysts: ["8月12日多头启动时间窗", "周中渐进修复", "7×24市场连续交易带来的周末延伸"],
  risks: ["10–11日仍可能下探", "15日前后冲高回落", "高波动下不适合追涨杀跌"],
  riskLevel: "高",
  confidence: 64,
  publishedAt: PUBLISHED_AT_V2,
  updatedAt: PUBLISHED_AT_V2,
  status: "published",
  visibility: "member",
  sourceIds: [
    "eth-liuyao-20260731",
    "btc-eth-liuyao-crosscheck-20260801",
    "LIUYAO-TEACHER02-WEEKLY-20260810",
  ],
  version: 1,
  originalLocked: true,
};

const GOLD_V2: WeeklyAnalysisRecord = {
  ...BASE_GOLD_V1,
  id: "WEEKLY-GOLD-20260810-V2",
  overallDirection: "震荡上涨",
  weeklyPath:
    "主方向仍维持震荡上涨，但周内路径细化为‘先跌—反弹—再冲高回落’。8月10日至11日先看砸盘与低点窗口；11日至12日若出现承接，进入反弹修复；13日至14日更容易冲高，但冲高后仍需防回吐。中期偏多背景不等于下周单边上涨，交易上更重视急跌后的承接，而不是追涨。",
  headline:
    "黄金方向不改：仍是震荡上涨；新来源把路径细化为周初探底、周中反弹、后半周冲高回落。",
  probabilities: { up: 46, flat: 39, down: 15 },
  strongWindow: "2026-08-11至12日低位承接后的反弹窗口；13日至14日的再冲高窗口",
  weakWindow: "2026-08-10至11日周初砸盘；13日至14日冲高后的回吐风险",
  invalidation:
    "若黄金有效跌破既有技术中枢下沿并连续收在其下，中枢上移判断失效；若13日至14日稳定站上关键压力，则冲高回落风险下降并可能升级为更强上行。",
  confirmation:
    "周初下探后必须出现真实K线止跌与成交承接，再确认反弹；后半周突破压力必须以稳定收盘确认，不把短暂冲高当成有效突破。",
  catalysts: ["周初低点窗口", "11–12日反弹窗口", "中期震荡中枢仍偏上移"],
  risks: ["周初先跌", "13–14日冲高回落", "中期偏多与短线回撤并存"],
  basisWeights: {
    ...BASE_GOLD_V1.basisWeights!,
    note: "黄金总方法权重维持V1。新增第二位老师只进入六爻内部交叉验证；奇门20%仍来自原V1规则，不因本次材料继续上调。",
  },
  sourceIds: [
    ...(BASE_GOLD_V1.sourceIds ?? []),
    "LIUYAO-TEACHER02-WEEKLY-20260810",
  ],
  publishedAt: PUBLISHED_AT_V2,
  updatedAt: PUBLISHED_AT_V2,
  version: 2,
  originalLocked: true,
  revisions: [
    {
      version: 1,
      previousContent: "V1方向=震荡上涨；路径=中枢上移、回落后再挑战压力。",
      changedAt: PUBLISHED_AT_V2,
      reason: "新增第二位六爻老师的事前周度材料；方向不变，细化10–11低点、11–12反弹、13–14冲高回落。",
    },
  ],
};

const SILVER_V1: WeeklyAnalysisRecord = {
  id: "WEEKLY-SILVER-20260810-V1",
  assetId: "silver",
  assetName: "国际银价",
  symbol: "SILVER",
  displaySymbol: "SILVER",
  weekStart: WEEK_START,
  weekEnd: WEEK_END,
  overallDirection: "震荡上涨",
  weeklyPath:
    "白银的节奏比黄金更激进。8月10日至11日仍可能保留上冲动能；11日至12日进入中段砸坑与周内低点窗口；13日至14日若低点确认，更容易出现连续两日左右的强势反攻。周末前后仍属于高波动震荡，不把强攻段等同于持续单边上涨。",
  headline:
    "白银下周偏强但波动更大：前段上冲、中段砸坑、13–14日再强攻，追涨性价比低。",
  probabilities: { up: 47, flat: 36, down: 17 },
  strongWindow: "2026-08-13至2026-08-14：砸坑完成后的强势反攻窗口",
  weakWindow: "2026-08-11至2026-08-12：中段爆破/周内低点窗口",
  basisWeights: NEW_SOURCE_BLEND,
  keySupport: [],
  keyResistance: [],
  invalidation:
    "若11日至12日下探后没有形成止跌并继续破坏中期结构，则13日至14日强攻路径失效；若前段直接加速突破并稳定站住，则中段砸坑幅度可能缩小。",
  confirmation:
    "只在真实K线出现低点确认、回收关键结构并伴随有效承接后，才提高13日至14日反攻权重。老师提到的62属于技术K线参考，本次不作为正式支撑/压力发布。",
  catalysts: ["11–12日低点窗口", "13–14日强攻窗口", "白银高弹性特征"],
  risks: ["振幅显著高于黄金", "中段急跌", "强攻后重新进入高波动震荡"],
  riskLevel: "高",
  confidence: 63,
  publishedAt: PUBLISHED_AT_V2,
  updatedAt: PUBLISHED_AT_V2,
  status: "published",
  visibility: "member",
  sourceIds: [
    "precious-metals-crypto-oracle-0727",
    "LIUYAO-TEACHER02-WEEKLY-20260810",
  ],
  version: 1,
  originalLocked: true,
};

export const ARCHIVED_WEEKLY_ANALYSES_20260810: WeeklyAnalysisRecord[] = [
  { ...BASE_BTC_V1, status: "archived", updatedAt: PUBLISHED_AT_V2 },
  { ...BASE_GOLD_V1, status: "archived", updatedAt: PUBLISHED_AT_V2 },
];

export const PUBLISHED_WEEKLY_ANALYSES_20260810_V2: WeeklyAnalysisRecord[] = [
  BTC_V2,
  ETH_V1,
  BASE_SPX_V1,
  BASE_NDX_V1,
  BASE_SHCOMP_V1,
  BASE_HSTECH_V1,
  GOLD_V2,
  SILVER_V1,
];
