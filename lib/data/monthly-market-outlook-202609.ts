import type { MonthlyMarketOutlook } from "@/lib/data/monthly-market-outlook";

/**
 * September member outlook. Directions remain owned by the corresponding
 * monthly/stage Liu-Yao records. The Aug 19 teacher SPX chart outranks the
 * older MOOX self-cast SPX chart; public analyst material only adjusts risk.
 */
export const MONTHLY_MARKET_OUTLOOKS_202609: MonthlyMarketOutlook[] = [
  {
    assetId: "bitcoin", assetName: "比特币", assetNameEn: "Bitcoin", symbol: "BTC", venue: "全球加密市场", venueEn: "Global crypto market",
    periodStart: "2026-09-01", periodEnd: "2026-09-30", direction: "先涨后跌", volatility: "HIGH",
    probabilities: { up: 42, flat: 30, down: 28 },
    path: "前中段延续修复并冲击下半年主要高点/转折区；高位形成后，月中后段进入分化、回吐与重新筑底风险。",
    pathEn: "The early-to-middle part of September extends the repair into a test of the main H2 high/turn zone. Once a high forms, divergence, giveback and renewed basing risk rise later in the month.",
    keyWindow: "9月前中段观察高点形成；不编造精确日期。", keyWindowEn: "Watch the early-to-mid September high formation; no exact day is invented.",
    risk: "老师年度卦与半月卦同向，MOOX新卦只作第二票；到达高点窗口不等于整月持续上涨。", riskEn: "The teacher's annual and half-month readings align; the new MOOX chart is only secondary confirmation. A high window does not mean uninterrupted gains all month.",
    sourceNote: "老师年度/半月六爻优先，MOOX九月专问卦同向验证。", sourceNoteEn: "Teacher annual/half-month Liu Yao first, with an aligned MOOX September-specific check.", sourceComplete: true,
  },
  {
    assetId: "eth", assetName: "以太坊", assetNameEn: "Ether", symbol: "ETH", venue: "全球加密市场", venueEn: "Global crypto market",
    periodStart: "2026-09-01", periodEnd: "2026-09-30", direction: "震荡上涨", volatility: "HIGH",
    probabilities: { up: 50, flat: 29, down: 21 },
    path: "三个月卦把8月至9月列为相对偏强阶段，9月更容易形成阶段高点；进入高位后防六冲放大的急涨急跌。",
    pathEn: "The three-month reading keeps August–September relatively constructive and makes a September stage high more likely. Six-clash volatility raises sharp two-way risk near highs.",
    keyWindow: "9月阶段高点观察，10月结构变化风险随后上升。", keyWindowEn: "Watch for a September stage high; structural-change risk rises into October.",
    risk: "没有独立9月日卦或逐日路径，不能把三个月分段拆成每天必涨。", riskEn: "There is no standalone daily September chart or day-by-day path; the three-month segment cannot be converted into daily certainty.",
    sourceNote: "ETH三个月六爻的9月分段，不冒充独立日卦。", sourceNoteEn: "September segment of the ETH three-month Liu Yao study, not a fabricated daily reading.", sourceComplete: false,
  },
  {
    assetId: "sp500", assetName: "标普500指数", assetNameEn: "S&P 500", symbol: "SPX", venue: "美国指数市场", venueEn: "U.S. equity index market",
    periodStart: "2026-09-01", periodEnd: "2026-09-30", direction: "震荡下跌", volatility: "HIGH",
    probabilities: { up: 25, flat: 35, down: 40 },
    path: "月初仍可能出现结构性修复或冲高，但老师未来一个月卦把卖压放在更高优先级；九月整体按冲高受限、重心偏弱处理。",
    pathEn: "An early structural repair or rally remains possible, but the teacher's one-month reading gives selling pressure higher priority. September is treated as capped on rallies with a softer center of gravity.",
    keyWindow: "先观察月初修复能否站稳；失守主结构后回撤风险升级。", keyWindowEn: "First test whether an early repair can hold; downside risk escalates after the primary structure breaks.",
    risk: "老师水泽节月卦偏弱，高于MOOX旧自算月卦；中期选举年统计和低机构现金只提高风险，不单独定方向。", riskEn: "The teacher's bearish Jie monthly reading outranks the older MOOX self-cast chart. Midterm-year seasonality and low institutional cash raise risk but do not set direction alone.",
    sourceNote: "老师完整月卦优先；MOOX月卦与匿名宏观/仓位观点作分歧记录。", sourceNoteEn: "Complete teacher monthly reading first; MOOX chart and anonymous macro/positioning views remain disagreement evidence.", sourceComplete: true,
  },
  {
    assetId: "nasdaq-100", assetName: "纳斯达克100指数", assetNameEn: "Nasdaq 100", symbol: "NDX", venue: "美国指数市场", venueEn: "U.S. equity index market",
    periodStart: "2026-09-01", periodEnd: "2026-09-30", direction: "震荡下跌", volatility: "HIGH",
    probabilities: { up: 20, flat: 25, down: 55 },
    path: "9月上旬仍可能延续半月卦的上冲或修复，但高位难以站稳；进入酉月后兄弟金压制空亡财木，整月更偏冲高回落与重心下移。",
    pathEn: "Early September can still extend the half-month rebound, but upper levels may be hard to hold. In You month, stronger Brother metal restrains void Wealth wood, favoring a rally-fade and lower monthly center.",
    keyWindow: "上旬修复结束后的高位转弱，是九月主要观察点。", keyWindowEn: "The main September watch is a high-level rollover after the early repair.",
    risk: "半导体可能弱于大型权重；外部结构观点只作验证，不覆盖兑为泽月卦。", riskEn: "Semiconductors may underperform mega-caps. Outside structure views only verify and cannot override the Dui monthly chart.",
    sourceNote: "纳指九月六爻主导，老师半月卦负责上旬路径。", sourceNoteEn: "NDX September Liu Yao owns direction; the teacher half-month chart refines the early-month path.", sourceComplete: true,
  },
  {
    assetId: "hang-seng", assetName: "恒生科技指数", assetNameEn: "Hang Seng TECH Index", symbol: "HSTECH", venue: "香港交易所", venueEn: "Hong Kong market",
    periodStart: "2026-09-01", periodEnd: "2026-09-30", direction: "震荡上涨", volatility: "HIGH",
    probabilities: { up: 47, flat: 33, down: 20 },
    path: "妻财申金在酉月得旺、兄弟午火持世失令，资金条件改善；游魂与讼卦使上行反复，不按单边主升处理。",
    pathEn: "Wealth Shen strengthens in You month while Brother Wu holding self loses season, improving capital conditions. Wandering-soul and Song structures keep the rise uneven rather than one-way.",
    keyWindow: "九月为8月至10月三个月中的相对强窗口。", keyWindowEn: "September is the relatively strongest window in the Aug–Oct path.",
    risk: "十月回吐概率上升，九月冲高后需防提前兑现。", riskEn: "October giveback risk rises, so late-September profit taking may arrive early.",
    sourceNote: "恒科九月六爻与三个月卦交叉。", sourceNoteEn: "September HSTECH Liu Yao cross-checked against the three-month study.", sourceComplete: true,
  },
  {
    assetId: "gold", assetName: "国际金价", assetNameEn: "Gold", symbol: "GOLD", venue: "COMEX黄金期货", venueEn: "COMEX gold futures",
    periodStart: "2026-09-01", periodEnd: "2026-09-30", direction: "震荡下跌", volatility: "HIGH",
    probabilities: { up: 28, flat: 37, down: 35 },
    path: "妻财寅木持世但受酉月兄弟酉金克制，月内先承压；子孙亥水得金生后保留修复，因此不是单边崩跌。",
    pathEn: "Wealth Yin holds self but is restrained by Brother You in You month, creating early pressure. Child Hai can receive metal support and preserve a repair branch, so this is not a one-way collapse call.",
    keyWindow: "先压后修复；反弹是否转强必须等新周卦确认。", keyWindowEn: "Pressure first, then repair; a stronger reversal requires a new weekly chart.",
    risk: "长期看多黄金的外部宏观观点不覆盖九月月卦；长期与单月方向分开。", riskEn: "An outside long-term bullish gold view does not override the September monthly chart; long-term and one-month directions stay separate.",
    sourceNote: "黄金九月六爻主导，狼叔专项周卦只负责对应周。", sourceNoteEn: "September gold Liu Yao owns the month; specialist weekly readings only govern their own week.", sourceComplete: true,
  },
  {
    assetId: "wti-crude", assetName: "WTI原油", assetNameEn: "WTI Crude Oil", symbol: "WTI", venue: "NYMEX原油期货", venueEn: "NYMEX crude oil futures",
    periodStart: "2026-09-01", periodEnd: "2026-09-30", direction: "震荡上涨", volatility: "HIGH",
    probabilities: { up: 45, flat: 35, down: 20 },
    path: "妻财酉金临酉月并临应，世爻子孙辰土可生财，月内偏修复；兄弟午火发动化官鬼亥水，反弹伴随风险与高位分歧。",
    pathEn: "Wealth You is on response and gains You-month strength while Child Chen can generate wealth, favoring repair. Moving Brother Wu into Ghost Hai keeps risk and high-level disagreement elevated.",
    keyWindow: "九月偏修复，不能外推为长期趋势反转。", keyWindowEn: "September favors repair, not a confirmed long-term trend reversal.",
    risk: "地缘与政策事件只调整风险和仓位，不反转月卦方向。", riskEn: "Geopolitical and policy events adjust risk and sizing, not the monthly direction.",
    sourceNote: "WTI九月六爻。", sourceNoteEn: "WTI September Liu Yao.", sourceComplete: true,
  },
  {
    assetId: "shanghai-composite", assetName: "上证指数", assetNameEn: "Shanghai Composite", symbol: "SHCOMP", venue: "上海证券交易所", venueEn: "Shanghai Stock Exchange",
    periodStart: "2026-09-01", periodEnd: "2026-09-30", direction: "震荡下跌", volatility: "HIGH",
    probabilities: { up: 22, flat: 33, down: 45 },
    path: "妻财寅木受酉月兄弟申酉金压制，资金承接偏弱；游魂结构使反弹难持续，九月重心偏下。",
    pathEn: "Wealth Yin is restrained by strong Shen/You Brother metal, weakening capital follow-through. The wandering-soul structure makes rebounds less durable and keeps the September center softer.",
    keyWindow: "政策托底可形成反弹，但需防冲高后再次回落。", keyWindowEn: "Policy support can create rebounds, but renewed fading remains a risk.",
    risk: "看跌A股只作为风险提示，不进入自动交易Top-5。", riskEn: "Bearish A-share calls are risk notes only and cannot enter the automated-trading Top 5.",
    sourceNote: "上证九月六爻与三个月卦交叉。", sourceNoteEn: "September SHCOMP Liu Yao cross-checked against the three-month study.", sourceComplete: true,
  },
];
