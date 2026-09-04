import { MEMBER_SEPTEMBER_ROTATION_REPORT_20260826 as record } from "../data/member-september-rotation-report-20260826";

// Member-facing editorial copy only. Published records, scores and execution authority stay unchanged.
export const memberSectorOutlook = {
  title: "易老师9月判断：看反弹，也看退出窗口",
  boundary: "上半月看修复，中下旬重防守。",
  methodNote: "关键日需走势确认；共振指数不是胜率。",
  rows: [
    { asset: "半导体／SOXL／SNDK／MU", status: "防持续性不足", tone: "caution",
      outlook: "看修复，波动大、个股分化，持续性待确认。",
      rhythm: "9月7／10日后看转强；14—20日防兑现，21日前检查仓位。",
      action: "短线、趋势仓逢高保护利润；空仓等回踩，长期仓另看。",
      levels: ["转强观察 9月7—12日", "退出观察 9月14—20日", "重点检查 9月21日前"] },
    { asset: "比特币／以太坊", status: "先涨后跌观察", tone: "caution",
      outlook: "先涨后跌；短线仍可能上冲或震荡。",
      rhythm: "9月9—11日观察转弱；月底至10月初防回落，10—11月再看机会。",
      action: "冲高后保护利润，跌破支撑再确认转弱；不按日期直接开空。" },
    { asset: "黄金／白银", status: "短期节奏不确定", tone: "caution",
      outlook: "黄金修复后温和回调；白银短线单独看。",
      rhythm: "未来1—2周偏盘整或弱反弹，月底反弹待确认。",
      action: "不追急拉；9月7／14／22日高低点均未确认。" },
    { asset: "纳指／大型科技", status: "反弹注意兑现", tone: "caution",
      outlook: "上半月看反弹，科技股分化，后劲可能不足。",
      rhythm: "21日前检查仓位；月底防事件风险。",
      action: "短线与趋势仓反弹时保护利润，不追普涨。" },
    { asset: "苹果／腾讯", status: "分周期观察", tone: "caution",
      outlook: "苹果看短线机会，腾讯看回落后的长线机会。",
      rhythm: "苹果关注新品发布前；腾讯等回落企稳。",
      action: "苹果反弹不追高；腾讯先等承接确认。" },
    { asset: "原油／农业", status: "长周期观察", tone: "caution",
      outlook: "仅看长周期机会，短期仍可能跟随市场下跌。",
      rhythm: "关注运输风险、种植业、化肥与农药。",
      action: "原油不做日周交易；农业先观察，不凭题材追高。" },
    { asset: "科创50／美联储", status: "关注后劲与事件", tone: "caution",
      outlook: "科创50有望缓慢走高，后劲有限；9月加息概率不高。",
      rhythm: "9月7日后看科创修复；议息结果待公布。",
      action: "反弹注意兑现，不把利率预判当成已公布结果。" },
    { asset: "上证／恒生科技／标普500", status: "仅专题参考", tone: "caution",
      outlook: "仅专题观察，不做日周预测。",
      rhythm: "上证、恒科看有限修复；标普看反弹后兑现。",
      action: "不追普涨，反弹先看压力。" },
  ],
};

const primaryCopy: Record<string, [string, string, string, string]> = {
  "WTI-202609-THREE-MONTH": [record.primaryUpdate.items[2].conclusionZh, record.primaryUpdate.items[2].conclusionEn,
    "仅作长周期趋势解读，不恢复原油日预测、周预测或历史验证统计。", "Long-cycle outlook only. Oil daily/weekly forecasts and historical-verification coverage remain retired."],
  "BTC-2027-150K": ["2027年高点可能高于2026年，但目前不支持突破15万美元；这是门槛判断，不是精确最高价。", "The 2027 high may exceed 2026, but a break above USD 150k is not supported. This is a threshold assessment, not an exact high.", record.primaryUpdate.items[3].boundaryZh, record.primaryUpdate.items[3].boundaryEn],
  "SPCX-20260915-QIMEN": ["截至9月15日，倾向跌破135美元的概率不高；9月7—15日向上动能偏强，关注148、153、158附近，冲高后再防回落。", "Through Sep 15, a break below USD 135 appears less likely. Watch stronger upside momentum on Sep 7-15 and areas near 148, 153 and 158 before a possible fade.", "信心低—中，低点判断尚不稳定；这些价位只供观察，不是正式入场点或自动交易指令。", "Low-medium confidence: the low remains uncertain. These are observation levels, not formal entries or automated-trading instructions."],
};
const assetCopy: Record<string, [string, string]> = {
  SOXL: ["7—12日看高波动修复，持续性尚不确定。短线／趋势仓21日前检查退出；SNDK、MU强弱会分化。", "Watch volatile recovery Sep 7-12; persistence is uncertain. Review short-term/trend exits before Sep 21. SNDK and MU may diverge."],
  GOLD: ["7日前试高，之后温和回调；短期偏盘整或弱反弹，月底反弹待确认。", "Watch a high probe before Sep 7, then a mild pullback. Near-term consolidation or a weak bounce; a month-end recovery needs confirmation."],
};
const riskUsage: Record<string, [string, string]> = {
  "GLOBAL-RISK-20260927": ["中下旬优先保护利润，预先考虑月底高波动。", "Prioritize profit protection later in the month and prepare for volatility."],
  "BTC-20260908-1008-QIMEN": ["9月27日不是确定底部，共振指数维持4/5。", "Sep 27 is not a confirmed bottom. The consensus index remains 4/5."],
  "TECH-20260908-1008-QIMEN": ["共振指数4/5，反弹持续性仍不确定，重视选股而非押注普涨。", "Consensus is 4/5. Recovery persistence remains uncertain; favor selection over assuming a broad rally."],
  "GOLD-20260908-1008-QIMEN": ["共振指数4/5，实际跌幅和反弹起点仍须由价格结构确认。", "Consensus is 4/5; price structure must confirm the decline and rebound timing."],
  "WTI-20260908-1008-QIMEN": ["长周期研究共振4/5，不恢复日周预测、历史验证或自动交易。", "Long-cycle research consensus is 4/5. Daily/weekly forecasts, verification and automated trading remain retired."],
  "MONTH-WEEK-20260904": ["按持仓周期分别安排应对，不把短线修复当作整月单边趋势。", "Match the plan to the holding horizon; a short recovery does not establish a one-way monthly trend."],
  "AGRICULTURE-20260904": ["农业仅作主题观察，原油仅作长周期专题；不新增自动交易品种。", "Agriculture is a watch theme and oil stays long-cycle research only. No new automated-trading instruments."],
};
const riskConclusion: Record<string, [string, string]> = {
  "WTI-20260908-1008-QIMEN": ["运输受阻与地缘摩擦可能放大油价波动；9月观察缓慢上行，10月关注高位候选。", "Transport disruption and geopolitical friction may amplify oil volatility. Watch a gradual September rise and a candidate high in October."],
  "MONTH-WEEK-20260904": ["半导体下周可能修复，但上涨持续性仍不确定；BTC可能继续宽幅震荡，黄金反弹起点尚不清晰。", "Semiconductors may recover next week, but persistence is uncertain. BTC may remain in wide ranges and gold's rebound timing remains unclear."],
  "AGRICULTURE-20260904": ["长周期关注美国种植业、中国化肥与农药；这些板块也可能先随市场下跌、随后修复，不是绝对避险资产。", "Watch US crop production and Chinese fertilizers and crop protection over the longer term. These sectors may first fall with markets before recovering; they are not absolute hedges."],
};
const confidenceReasons: Record<string, [string, string]> = {
  "BTC-SEPTEMBER-PATH": ["上旬仍有上冲空间，中下旬至10月初防转弱；9月9—11日只作转折观察，不是确定顶部。", "An early push remains possible; watch for weakness into late September and early October. Sep 9-11 is a turn-watch window, not a confirmed top."],
  "TECH-SEPTEMBER-ROTATION": ["9月7日后相对转强，但成分股分化、上涨持续性不确定；反弹后更重视退出条件。", "Relative strength may emerge after Sep 7, but constituents diverge and persistence is uncertain. Prioritize exit conditions after rallies."],
};

export const memberSeptemberOutlook = {
  version: record.version,
  titleZh: "易老师9月判断：先看修复，21日前重点检查科技仓位",
  titleEn: "September outlook: recovery first, review technology exposure before Sep 21",
  conclusionZh: "上半月看修复，中下旬保护利润。",
  conclusionEn: "Watch early-month recovery; protect gains later in September.",
  executionZh: ["半导体：7—12日看修复，14—20日防兑现，21日前检查短线／趋势仓。", "BTC／ETH：9—11日观察转弱，冲高后保护利润，先等价格确认。", "黄金：短期盘整或弱反弹，月底反弹待确认，不急着抄底。"],
  executionEn: ["Semiconductors: watch Sep 7-12 recovery; protect gains Sep 14-20 and review short-term/trend exposure before Sep 21.", "BTC/ETH: watch for weakness Sep 9-11. Protect gains after rallies; require price confirmation.", "Gold: near-term consolidation or a weak bounce. A month-end recovery needs confirmation; do not rush to buy dips."],
  assets: record.assets.map((asset) => ({ ...asset, conclusionZh: assetCopy[asset.symbol]?.[0] ?? asset.conclusionZh, conclusionEn: assetCopy[asset.symbol]?.[1] ?? asset.conclusionEn })),
  primaryItems: record.primaryUpdate.items.map((item) => ({ id: item.id, scopeZh: item.scopeZh, scopeEn: item.scopeEn, confidenceZh: item.confidenceZh, confidenceEn: item.confidenceEn,
    conclusionZh: primaryCopy[item.id]?.[0] ?? item.conclusionZh, conclusionEn: primaryCopy[item.id]?.[1] ?? item.conclusionEn,
    boundaryZh: primaryCopy[item.id]?.[2] ?? item.boundaryZh, boundaryEn: primaryCopy[item.id]?.[3] ?? item.boundaryEn })),
  riskWindow: record.qimenMonthlyUpdate.riskWindow,
  riskItems: record.qimenMonthlyUpdate.items.map((item) => ({ id: item.id, scopeZh: item.scopeZh, scopeEn: item.scopeEn,
    statusZh: item.relationship === "CONFLICTED" ? "持续性有分歧" : item.relationship === "PARTIAL" ? "仍需确认" : "关注风险窗口",
    statusEn: item.relationship === "CONFLICTED" ? "Persistence uncertain" : item.relationship === "PARTIAL" ? "Confirmation needed" : "Watch risk window",
    conclusionZh: riskConclusion[item.id]?.[0] ?? item.conclusionZh, conclusionEn: riskConclusion[item.id]?.[1] ?? item.conclusionEn,
    usageZh: riskUsage[item.id]?.[0] ?? "等待走势确认，不按日期机械交易。", usageEn: riskUsage[item.id]?.[1] ?? "Wait for price confirmation; do not trade mechanically by date." })),
  confidenceItems: record.confidenceCalibration.items.map((item) => ({ id: item.id, scopeZh: item.scopeZh, scopeEn: item.scopeEn, index: item.index, max: item.max,
    reasonZh: confidenceReasons[item.id]?.[0] ?? "共振指数仅描述方法共振程度；具体方向、时间与幅度仍须分别确认。",
    reasonEn: confidenceReasons[item.id]?.[1] ?? "The consensus index describes method alignment only; direction, timing and magnitude still require separate confirmation." })),
  phases: record.phases.map((phase, index) => ({ ...phase,
    ...(index === 2 ? { soxlZh: "高位候选；21日前检查退出，之后防回撤", soxlEn: "Candidate high zone; review exits before Sep 21, then pullback risk", goldZh: "温和回调；月底反弹候选，待确认", goldEn: "Mild pullback; candidate month-end bounce needs confirmation", btcZh: "退守与高波动，等待走势确认", btcEn: "Defensive and volatile; await price confirmation" } : {}),
    ...(index === 3 ? { btcZh: "该阶段暂无确定判断", btcEn: "No firm view for this phase", ethZh: "有限修复后等待下一阶段确认", ethEn: "Await confirmation after a limited repair" } : {}),
  })),
};
