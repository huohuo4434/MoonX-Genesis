import { MEMBER_SEPTEMBER_ROTATION_REPORT_20260826 as record } from "../data/member-september-rotation-report-20260826";

// Member-facing editorial copy only. Published records, scores and execution authority stay unchanged.
export const memberSectorOutlook = {
  title: "易老师9月判断：看反弹，也看退出窗口",
  boundary: "上半月关注修复机会，中下旬更重视利润保护。短线、趋势仓和长期仓分开判断，不把反弹当成整月单边上涨。",
  methodNote: "日期是观察窗口，不是机械买卖指令。各品种分别确认走势；共振指数表示方法共振程度，不等于命中率或收益保证。",
  rows: [
    { asset: "半导体／SOXL／SNDK／MU", status: "防持续性不足", tone: "caution",
      outlook: "9月7日／10日后关注相对转强，但个股强弱会分化，不能把板块修复理解为全部同涨。",
      rhythm: "9月7—12日看高波动上扬；上涨能持续多久仍不确定，短线与趋势仓在21日前重点检查退出条件。",
      action: "已有仓位关注利润保护；未持仓先等回踩承接，不追普涨。9月14—20日加强退出检查，低成本长期仓单独判断。",
      levels: ["转强观察 9月7—12日", "退出观察 9月14—20日", "重点检查 9月21日前"] },
    { asset: "比特币／以太坊", status: "先涨后跌观察", tone: "caution",
      outlook: "9月按先涨后跌的路径观察。BTC在9月9—11日重点看是否转弱，目前不能认定顶部已经确认。",
      rhythm: "短线仍可能上冲或宽幅震荡；月底至10月初更需防回落，10—11月再观察机会。ETH留意与BTC的联动，但仍需自身走势确认。",
      action: "不因到了9月10日就机械开空；冲高回落、支撑失守后再确认转弱。未明确到具体一周的时间信号，不当作确定买卖日。" },
    { asset: "黄金／白银", status: "短期节奏不确定", tone: "caution",
      outlook: "黄金保留阶段修复后温和回调的判断；中长期偏多不等于下周立即大涨。",
      rhythm: "未来一至两周可能盘整或弱反弹，月底再看上扬。反弹起点和短期强弱仍不确定；白银长期留意黄金联动，短线独立观察。",
      action: "降低立即V形反转的期待，短线与长期仓分开看。9月7日、14日、22日均不能当作已确认的高低点，任何价区都不是保证底部。" },
    { asset: "纳指／大型科技", status: "反弹注意兑现", tone: "caution",
      outlook: "上半月关注反弹机会，但科技股会分化，不能把一个板块的修复推广为所有科技股同涨。",
      rhythm: "情绪有望推动反弹，但流动性可能限制持续性；月底事件风险需提前防范。",
      action: "短线与趋势仓在反弹时检查兑现条件，21日前重点检查仓位。地缘冲突是风险情景，不是已经发生的事实。" },
    { asset: "苹果／腾讯", status: "分周期观察", tone: "caution",
      outlook: "两者分别按自己的月周方向判断，短线机会与长期配置不能混为一谈。",
      rhythm: "苹果关注新品发布前的短线机会；腾讯更偏向回落后的长线观察，长期看好不等于本周立即买入。",
      action: "苹果不把发布会行情外推到整月；腾讯等待自身价格结构确认，观察价区不作为自动下单点。" },
    { asset: "原油／农业", status: "长周期观察", tone: "caution",
      outlook: "原油仅做长周期专题；农业为主题观察，不新增正式日周预测。",
      rhythm: "关注运输风险、种植业、化肥与农药的长周期机会；系统性回落时也可能先跌后修复。",
      action: "两者都不是绝对避险资产，不凭题材直接选股；原油不恢复日内、每日、每周预测或自动交易。" },
    { asset: "科创50／美联储", status: "关注后劲与事件", tone: "caution",
      outlook: "科创50在9月7日后有望缓慢走高，但涨幅和后劲可能有限；9月美联储加息概率判断不高。",
      rhythm: "科创50留意情绪性反弹后的兑现压力；利率维持不变属于观察情景，不是已经公布的决议。",
      action: "不把短线修复理解为整月无回撤；利率以正式公布结果为准。" },
    { asset: "上证／恒生科技／标普500", status: "仅专题参考", tone: "caution",
      outlook: "已退出正式日周预测，仅保留专题市场观察。",
      rhythm: "上证、恒生科技关注有限修复；标普更重视反弹中的短线机会与退出，并非各指数一致强多。",
      action: "专题观察不进入新的日周预测、历史验证或自动交易。" },
  ],
};

const primaryCopy: Record<string, [string, string, string, string]> = {
  "WTI-202609-THREE-MONTH": [record.primaryUpdate.items[2].conclusionZh, record.primaryUpdate.items[2].conclusionEn,
    "仅作长周期趋势解读，不恢复原油日预测、周预测或历史验证统计。", "Long-cycle outlook only. Oil daily/weekly forecasts and historical-verification coverage remain retired."],
  "BTC-2027-150K": ["2027年高点可能高于2026年，但目前不支持突破15万美元；这是门槛判断，不是精确最高价。", "The 2027 high may exceed 2026, but a break above USD 150k is not supported. This is a threshold assessment, not an exact high.", record.primaryUpdate.items[3].boundaryZh, record.primaryUpdate.items[3].boundaryEn],
  "SPCX-20260915-QIMEN": ["截至9月15日，倾向跌破135美元的概率不高；9月7—15日向上动能偏强，关注148、153、158附近，冲高后再防回落。", "Through Sep 15, a break below USD 135 appears less likely. Watch stronger upside momentum on Sep 7-15 and areas near 148, 153 and 158 before a possible fade.", "信心低—中，低点判断尚不稳定；这些价位只供观察，不是正式入场点或自动交易指令。", "Low-medium confidence: the low remains uncertain. These are observation levels, not formal entries or automated-trading instructions."],
};
const assetCopy: Record<string, [string, string]> = {
  SOXL: ["9月7日至10月7日保留相对强势候选，但9月7—12日的修复可能伴随剧烈波动，持续性尚不确定。短线与趋势仓在21日前重点检查退出条件，不是整段放心持有；SOXL、SNDK、MU也不会必然同幅上涨。", "Relative strength remains a candidate for Sep 7-Oct 7, but the Sep 7-12 recovery may be volatile and its persistence is uncertain. Review short-term/trend exits before Sep 21 rather than holding unconditionally. SOXL, SNDK and MU need not move by the same amount."],
  GOLD: ["保留9月7日前试高、之后温和回调的路径，同时防范未来一至两周盘整或弱反弹。短期强弱与反弹起点仍有不确定性；月底上扬只是候选，中长期偏多不等于下周立即大涨。", "Retain a high-probe path before Sep 7 followed by a mild pullback, while allowing one to two weeks of consolidation or a weak bounce. Near-term strength and rebound timing remain uncertain. A month-end bounce is a candidate, not an immediate rally implied by longer-term bullishness."],
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
  conclusionZh: "半导体9月7日／10日后关注相对转强，下周可能高波动上扬，但不宜理解为一路持有到月底。短线与趋势仓在反弹时检查退出条件，21日前重点检查。BTC、ETH上旬仍可冲高，随后防转弱；黄金短期可能继续盘整。各资产分别判断，不假设必然同涨或反向。",
  conclusionEn: "Watch relative semiconductor strength after Sep 7/10 and a potentially volatile recovery next week, not an unconditional hold through month-end. Review short-term/trend exits on rallies and technology exposure before Sep 21. BTC/ETH may push higher early before turning softer; gold may consolidate. Assets need not move together or inversely.",
  executionZh: [record.executionZh[0], "BTC／ETH：9月9—11日重点观察转弱，但也可能宽幅震荡、暂时跌不动。先等价格确认；月底至10月初另防风险，10—11月只是候选机会。", "黄金区分短期盘整与中长期偏多，月底反弹尚待确认；日期或价位都不是保证底部。原油只保留长周期专题，农业只作研究观察，不新增自动交易品种。"],
  executionEn: [record.executionEn[0], "BTC/ETH: watch for a turn on Sep 9-11, but wide ranges and delayed downside remain possible. Require price confirmation. Late September/early October is a separate risk window; October-November remains a candidate opportunity.", "Distinguish short-term gold consolidation from longer-term bullishness. A month-end rebound needs confirmation; dates and levels do not guarantee a bottom. Oil stays long-cycle research and agriculture a watch theme, without new automated-trading coverage."],
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
