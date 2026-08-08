import {
  ASTEROID_PERIOD_LABELS,
  type ConvictionForecastType,
  type ConvictionPeriodForecast,
} from "@/lib/data/conviction/asteroid-forecasts";

const PUBLISHED_AT = "2026-08-08T08:50:00+08:00";

export const GOOGLE_VISIBLE_PERIOD_ORDER: ConvictionForecastType[] = ["WEEK", "WEEK_2", "WEEK_3", "WEEK_4", "MONTH_1"];
export const GOOGLE_PERIOD_ORDER: ConvictionForecastType[] = ["WEEK", "WEEK_2", "WEEK_3", "WEEK_4", "MONTH_1", "MONTH_3"];

export const GOOGLE_PERIOD_FORECASTS: ConvictionPeriodForecast[] = [
  {
    id: "GOOGL-W1-20260810-V2", assetId: "googl", forecastType: "WEEK", periodStart: "2026-08-10", periodEnd: "2026-08-16", direction: "震荡上涨",
    upProbability: 55, sidewaysProbability: 28, downProbability: 17,
    summary: "泽天夬→泽雷随。夬主决断和破局，随主跟随与承接。结构力上，申月金旺能生水财，前段更容易出现方向性表态；但周后段需要防冲高换手。",
    expectedPath: "8/10—12偏强启动与延续 → 8/13换手分歧 → 8/14若结构未坏仍偏修复上行；8/15—16休市只做风险观察。",
    supportLevels: [], resistanceLevels: [], confirmationLevel: "回踩后快速收回并站稳前一交易日高点。", invalidationLevel: "连续放量跌破周初平台且1小时结构转空。", riskLevel: "中高",
    catalysts: ["AI商业化", "Google Cloud", "大型科技风险偏好"], risks: ["财报后估值分歧", "资本开支", "监管事件"],
    consensusStars: 5, consensusLabel: "总卦与周卦方向高度一致：先起势、再得到承接",
    methodViews: [
      { id: "googl-structure-w1", label: "框架A·六亲世应", direction: "震荡上涨", weight: 55, summary: "申月对水财条件改善，阶段抛压不足以构成持续空头。" },
      { id: "googl-timeline-w1", label: "框架B·卦变时序", direction: "震荡上涨", weight: 45, summary: "夬到随体现先决断、再跟随，适合定义为启动周。" },
    ],
    ichingEvidence: { primaryHexagram: "泽天夬", changingHexagram: "泽雷随（归魂）", notes: "按两套框架交叉：前段决断起势，后段看市场承接，整体偏多但不等于每天直线上涨。" },
    version: 2, status: "published", sourceType: "ICHING_RESEARCH", publishedAt: PUBLISHED_AT, lockedAt: PUBLISHED_AT, validationStatus: "UNVERIFIED",
  },
  {
    id: "GOOGL-W2-20260817-V1", assetId: "googl", forecastType: "WEEK_2", periodStart: "2026-08-17", periodEnd: "2026-08-23", direction: "探底回升",
    upProbability: 48, sidewaysProbability: 34, downProbability: 18,
    summary: "地雷复（六合）→山雷颐（游魂）。复主回归，颐主养势；更像前一段起势后的回踩、修复与重新蓄力。",
    expectedPath: "8/17先观察 → 8/18允许二次回踩 → 8/19企稳 → 8/20—21偏修复上行；8/22—23休市观察。",
    supportLevels: [], resistanceLevels: [], confirmationLevel: "回踩不破且15分钟/1小时低点抬高。", invalidationLevel: "回踩演变为持续放量破位。", riskLevel: "中高",
    catalysts: ["回踩承接", "AI大型科技资金回流"], risks: ["游魂带来的反复", "宏观风险偏好"],
    consensusStars: 4, consensusLabel: "两框架都支持‘回归—养势’，但稳定性低于第一周",
    methodViews: [
      { id: "googl-structure-w2", label: "框架A·六亲世应", direction: "探底回升", weight: 55, summary: "风险释放后财与子孙更容易得到承接，回踩不等于趋势转空。" },
      { id: "googl-timeline-w2", label: "框架B·卦变时序", direction: "探底回升", weight: 45, summary: "复到颐是回归后养势，适合看先弱后稳。" },
    ],
    ichingEvidence: { primaryHexagram: "地雷复（六合）", changingHexagram: "山雷颐（游魂）", notes: "核心不是追涨，而是等待回踩后的真正复归节点。" },
    version: 1, status: "published", sourceType: "ICHING_RESEARCH", publishedAt: PUBLISHED_AT, lockedAt: PUBLISHED_AT, validationStatus: "UNVERIFIED",
  },
  {
    id: "GOOGL-W3-20260824-V1", assetId: "googl", forecastType: "WEEK_3", periodStart: "2026-08-24", periodEnd: "2026-08-30", direction: "震荡上涨",
    upProbability: 58, sidewaysProbability: 27, downProbability: 15,
    summary: "雷风恒→泽山咸。恒主持续，咸主感应与共振，是8月后半段最像趋势延续的一周。",
    expectedPath: "8/24—27趋势延续，8/26前后可能出现共振加速；8/28更容易冲高震荡，周末不计正式验证。",
    supportLevels: [], resistanceLevels: [], confirmationLevel: "高低点同步抬升、回踩关键均线不破。", invalidationLevel: "放量长上影后跌回突破平台。", riskLevel: "中高",
    catalysts: ["趋势资金", "纳指共振", "AI大型科技相对强度"], risks: ["月底获利盘", "高位分歧"],
    consensusStars: 5, consensusLabel: "恒与咸都偏向持续和共振，是本轮较强窗口",
    methodViews: [
      { id: "googl-structure-w3", label: "框架A·六亲世应", direction: "震荡上涨", weight: 55, summary: "前两周若完成起势和修复，本周结构力更利持续。" },
      { id: "googl-timeline-w3", label: "框架B·卦变时序", direction: "震荡上涨", weight: 45, summary: "恒到咸对应持续后形成市场共振。" },
    ],
    ichingEvidence: { primaryHexagram: "雷风恒", changingHexagram: "泽山咸", notes: "趋势延续优先，越靠近周尾越需要用量价确认是否开始兑现。" },
    version: 1, status: "published", sourceType: "ICHING_RESEARCH", publishedAt: PUBLISHED_AT, lockedAt: PUBLISHED_AT, validationStatus: "UNVERIFIED",
  },
  {
    id: "GOOGL-W4-20260831-V1", assetId: "googl", forecastType: "WEEK_4", periodStart: "2026-08-31", periodEnd: "2026-09-06", direction: "震荡",
    upProbability: 40, sidewaysProbability: 40, downProbability: 20,
    summary: "巽为风（六冲）→风天小畜。仍有顺势惯性，但六冲与小畜共同提示从推进切换到收敛、蓄势和分歧。",
    expectedPath: "8/31先看高位整固；9月初若守住8月下旬突破区，则仍保留向上余量，但不再按加速周处理。",
    supportLevels: [], resistanceLevels: [], confirmationLevel: "突破区守住并缩量整理。", invalidationLevel: "跌回8月中旬平台并持续失去承接。", riskLevel: "中高",
    catalysts: ["高位蓄势", "资金轮动"], risks: ["六冲", "9月分歧抬升"],
    consensusStars: 4, consensusLabel: "方向未坏，但节奏从强推进转为蓄势",
    methodViews: [
      { id: "googl-structure-w4", label: "框架A·六亲世应", direction: "震荡", weight: 55, summary: "强势后需要重新平衡，追高收益风险比下降。" },
      { id: "googl-timeline-w4", label: "框架B·卦变时序", direction: "震荡", weight: 45, summary: "巽到小畜是顺势而行后收敛蓄势。" },
    ],
    ichingEvidence: { primaryHexagram: "巽为风（六冲）", changingHexagram: "风天小畜", notes: "从趋势加速转向高位整固，观察而非追涨。" },
    version: 1, status: "published", sourceType: "ICHING_RESEARCH", publishedAt: PUBLISHED_AT, lockedAt: PUBLISHED_AT, validationStatus: "UNVERIFIED",
  },
  {
    id: "GOOGL-M1-20260808-V2", assetId: "googl", forecastType: "MONTH_1", periodStart: "2026-08-08", periodEnd: "2026-09-06", direction: "震荡上涨",
    upProbability: 54, sidewaysProbability: 29, downProbability: 17,
    summary: "总卦地泽临→地天泰（六合）与四段周卦高度连贯。最核心的路径不是‘先跌后涨’，而是8月中旬起势、17—23日修复回归、24—30日趋势延续、8月31日至9月初转高位蓄势。",
    expectedPath: "启动 → 修复 → 恒势推进 → 高位收敛。9月正式进入萃→讼后，热度与分歧同时抬升。",
    supportLevels: [], resistanceLevels: [], confirmationLevel: "每个周度窗口均由价格结构确认：突破、回踩收回、低点抬高或趋势延续。", invalidationLevel: "8月中旬后持续放量创新低，且大型科技相对强度同步转弱。", riskLevel: "中高",
    catalysts: ["Google Cloud", "AI商业化", "广告与搜索现金流", "大型科技风险偏好"], risks: ["资本开支", "监管", "估值与获利盘", "9月分歧"],
    aiEvidence: "MOOX将卦象用于方向与时间窗口；实际转折节点必须由量价、1小时结构和纳指环境确认。",
    ichingEvidence: { primaryHexagram: "地泽临", changingHexagram: "地天泰（六合）", notes: "总卦定改善基调；夬→随、复→颐、恒→咸、巽→小畜依次对应起势、修复、延续、蓄势，连贯性高。" },
    consensusStars: 5, consensusLabel: "两套六爻框架与分段卦高度连贯",
    methodViews: [
      { id: "googl-structure-month-v2", label: "框架A·六亲世应", direction: "震荡上涨", weight: 55, summary: "财爻条件后段改善，阶段抛压不足以贯穿整月。" },
      { id: "googl-timeline-month-v2", label: "框架B·卦变时序", direction: "震荡上涨", weight: 45, summary: "临→泰总基调与四个分段卦构成完整的改善路径。" },
    ],
    version: 2, status: "published", sourceType: "ICHING_RESEARCH", publishedAt: PUBLISHED_AT, lockedAt: PUBLISHED_AT, validationStatus: "UNVERIFIED",
  },
  {
    id: "GOOGL-M3-20260901-V1", assetId: "googl", forecastType: "MONTH_3", periodStart: "2026-09-01", periodEnd: "2026-11-30", direction: "震荡",
    upProbability: 37, sidewaysProbability: 40, downProbability: 23,
    summary: "9月泽地萃→天水讼：先聚集、后争议；10月山水蒙：重新定价、方向不清；11月水风井→天风姤：底层支撑仍在，但事件扰动增加。",
    expectedPath: "9月热度与分歧并存 → 10月整理与等待 → 11月基本面支撑下的事件型波动。12月另有大有→恒的再改善信号。",
    supportLevels: [], resistanceLevels: [], riskLevel: "中高",
    catalysts: ["AI商业化", "云增长", "12月再改善窗口"], risks: ["9月分歧", "10月蒙卦不明", "11月突发事件"],
    archiveSummary: "9月分歧加大，10月偏整理，11月事件扰动；12月重新偏强。",
    ichingEvidence: { primaryHexagram: "泽地萃→天水讼；山水蒙；水风井→天风姤", changingHexagram: "12月火天大有→雷风恒", notes: "8月强势窗口后，中期总卦艮→蒙限制线性上涨预期，故按阶段行情而非全年单边牛市处理。" },
    version: 1, status: "published", sourceType: "ICHING_RESEARCH", publishedAt: PUBLISHED_AT, lockedAt: PUBLISHED_AT, validationStatus: "UNVERIFIED",
  },
];

export function listGooglePeriodForecasts() {
  return GOOGLE_PERIOD_FORECASTS.filter((item) => item.status === "published");
}

export function googlePeriodMeta() {
  const periods = listGooglePeriodForecasts();
  return GOOGLE_VISIBLE_PERIOD_ORDER.map((type) => ({
    type,
    labelZh: ASTEROID_PERIOD_LABELS[type].zh,
    emptyZh: ASTEROID_PERIOD_LABELS[type].emptyZh,
    hasResearch: periods.some((item) => item.forecastType === type),
  }));
}
