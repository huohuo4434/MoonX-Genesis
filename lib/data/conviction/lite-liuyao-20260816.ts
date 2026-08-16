import {
  type ConvictionForecastType,
  type ConvictionPeriodForecast,
} from "@/lib/data/conviction/asteroid-forecasts";

export type LITEResearchAssetId = "lite";

export function isLITEResearchAssetId(value: string): value is LITEResearchAssetId {
  return value === "lite";
}

export const LITE_PERIOD_ORDER: ConvictionForecastType[] = [
  "WEEK",
  "WEEK_2",
  "WEEK_3",
  "MONTH_1",
  "YEAR_1",
];
export const LITE_VISIBLE_PERIOD_ORDER = LITE_PERIOD_ORDER;

const LABELS: Record<ConvictionForecastType, { zh: string; en: string; emptyZh: string }> = {
  TODAY: { zh: "今日", en: "Today", emptyZh: "该周期研究尚未发布" },
  TOMORROW: { zh: "明日", en: "Tomorrow", emptyZh: "该周期研究尚未发布" },
  WEEK: { zh: "8/17–23", en: "Aug 17–23", emptyZh: "8/17–23研究尚未发布" },
  WEEK_2: { zh: "8/24–30", en: "Aug 24–30", emptyZh: "8/24–30研究尚未发布" },
  WEEK_3: { zh: "8/31–9/6", en: "Aug 31–Sep 6", emptyZh: "8/31–9/6研究尚未发布" },
  WEEK_4: { zh: "第四周", en: "Week 4", emptyZh: "该周期研究尚未发布" },
  MONTH_1: { zh: "8/17–9/30", en: "Aug 17–Sep 30", emptyZh: "8/17–9/30研究尚未发布" },
  MONTH_3: { zh: "3个月", en: "3M", emptyZh: "该周期研究尚未发布" },
  YEAR_1: { zh: "8/17–12/31", en: "Aug 17–Dec 31", emptyZh: "8/17–12/31研究尚未发布" },
  YEAR_3: { zh: "3年", en: "3Y", emptyZh: "该周期研究尚未发布" },
  YEAR_5: { zh: "5年", en: "5Y", emptyZh: "该周期研究尚未发布" },
  YEAR_10: { zh: "10年", en: "10Y", emptyZh: "该周期研究尚未发布" },
};

export function litePeriodLabel20260816(type: ConvictionForecastType) {
  return LABELS[type];
}

const PUBLISHED_AT = "2026-08-16T11:45:00+08:00";
const CALENDAR = "原图统一显示：丙午年、丙申月、壬戌日、乙巳时（日空子丑）。";

function publish(
  input: Omit<ConvictionPeriodForecast,
    "riskLevel" | "sourceType" | "publishedAt" | "lockedAt" |
    "validationStatus" | "status" | "version">,
): ConvictionPeriodForecast {
  return {
    ...input,
    riskLevel: "高",
    version: 1,
    status: "published",
    sourceType: "ICHING_RESEARCH",
    publishedAt: PUBLISHED_AT,
    lockedAt: PUBLISHED_AT,
    validationStatus: "UNVERIFIED",
  };
}

const WAVE_SOURCE =
  "外部波浪旁证只负责执行位置：817.57为结构失效观察位，1032为第一确认/目标，1265为主要波段目标，1680为长期目标。点位不参与六爻方向投票，也不构成必达承诺。";

export const LITE_LIUYAO_FORECASTS_20260816: ConvictionPeriodForecast[] = [
  publish({
    id: "LITE-W1-20260817-V1",
    assetId: "lite",
    forecastType: "WEEK",
    periodStart: "2026-08-17",
    periodEnd: "2026-08-23",
    direction: "冲高回落",
    upProbability: 22,
    sidewaysProbability: 30,
    downProbability: 48,
    summary:
      "老师01看妻财寅木明现，但目标阶段仍处申月，寅木受冲，财爻的持续上行动力不稳；父母辰土发动，更多体现消息、筹码和结构变化。老师02看火天大有（归魂）变火泽睽，大有说明此前已有较大涨幅和市场热度，睽则代表高位分歧，归魂又加强回到原区间的反复。",
    expectedPath:
      "本周更容易先有冲高或强势惯性，随后进入高位分歧、换手和回踩。不是长期转空，但不适合在财报或大阳线后追仓；技术上优先等817.57上方出现止跌结构。",
    supportLevels: ["817.57"],
    resistanceLevels: ["1032"],
    catalysts: ["大有卦保留强势基础", "AI光通信热度", "回踩后的筹码再集中"],
    risks: ["财寅木受申冲", "睽卦高位分歧", "归魂反复", "财报后追高"],
    consensusStars: 4,
    consensusLabel: "两位老师共同指向高位分歧与回踩，长期多头不等于本周可追",
    methodViews: [
      { id: "lite-w1-t01", label: "老师01·财爻受冲", direction: "冲高回落", weight: 65, summary: "财寅木在申月受冲，强势惯性后更容易进入换手和回踩。" },
      { id: "lite-w1-t02", label: "老师02·大有→睽归魂", direction: "冲高回落", weight: 35, summary: "大有说明已有强势，睽与归魂说明高位分歧和回到原区间反复。" },
    ],
    ichingEvidence: {
      primaryHexagram: "火天大有（归魂）",
      changingHexagram: "火泽睽",
      notes: `原卦题：Lumentum（LITE）8月17至23号走势情况。起卦时间2026-08-16 10:34；${CALENDAR} ${WAVE_SOURCE}`,
    },
  }),

  publish({
    id: "LITE-W2-20260824-V1",
    assetId: "lite",
    forecastType: "WEEK_2",
    periodStart: "2026-08-24",
    periodEnd: "2026-08-30",
    direction: "震荡上涨",
    upProbability: 58,
    sidewaysProbability: 27,
    downProbability: 15,
    summary:
      "老师01看父母未土发动后化妻财卯木，说明基本面、消息或筹码沉淀最终向价格端转化；卦中财卯木亦明现。老师02看泽地萃变风雷益，萃为资金聚集，益为增益与扩张，路径比前一周明显转强。",
    expectedPath:
      "若8月17–23日完成高位换手，本周更容易从整理切换为震荡上行。仍不追单根急拉，优先观察回踩不破817.57，或突破1032后回踩确认。",
    supportLevels: ["817.57"],
    resistanceLevels: ["1032", "1265"],
    catalysts: ["父母未土化财卯木", "萃卦资金聚集", "益卦扩张"],
    risks: ["前周洗盘若不充分则启动延后", "高波动", "突破假动作"],
    consensusStars: 4,
    consensusLabel: "两位老师共同看8月24日后转强，技术只负责确认是否可执行",
    methodViews: [
      { id: "lite-w2-t01", label: "老师01·父母化财", direction: "震荡上涨", weight: 65, summary: "父母未土发动化财卯木，消息与筹码因素最终转为价格推动。" },
      { id: "lite-w2-t02", label: "老师02·萃→益", direction: "震荡上涨", weight: 35, summary: "萃主聚集，益主增益，资金和趋势在整理后重新向上。" },
    ],
    ichingEvidence: {
      primaryHexagram: "泽地萃",
      changingHexagram: "风雷益",
      notes: `原卦题：Lumentum（LITE）8月24至30号走势情况。起卦时间2026-08-16 10:35；${CALENDAR} ${WAVE_SOURCE}`,
    },
  }),

  publish({
    id: "LITE-W3-20260831-V1",
    assetId: "lite",
    forecastType: "WEEK_3",
    periodStart: "2026-08-31",
    periodEnd: "2026-09-06",
    direction: "震荡上涨",
    upProbability: 55,
    sidewaysProbability: 25,
    downProbability: 20,
    summary:
      "老师01看主卦妻财未土与妻财辰土明现，变卦财爻仍保留，价格端没有被化坏；但官鬼酉金发动，风险与波动会突然放大。老师02看泽雷随（归魂）变震为雷（六冲），随允许顺势上行，震六冲则意味着突破、回踩和再拉升会快速交替。",
    expectedPath:
      "方向仍偏多，但这是高波动上行周，不是平滑趋势。应把仓位和止损按六冲环境收紧；站稳1032并回踩不破，才更有利于向1265推进。",
    supportLevels: ["817.57"],
    resistanceLevels: ["1032", "1265"],
    catalysts: ["财未土/辰土保留", "随卦顺势", "前周资金聚集"],
    risks: ["官鬼酉金发动", "归魂反复", "震为雷六冲", "急拉急跌"],
    consensusStars: 4,
    consensusLabel: "两位老师共同偏多，但六冲决定仓位和买点必须更谨慎",
    methodViews: [
      { id: "lite-w3-t01", label: "老师01·财爻保留/官鬼发动", direction: "震荡上涨", weight: 65, summary: "财爻未被化坏，方向偏上；官鬼发动要求防范突然放大的风险。" },
      { id: "lite-w3-t02", label: "老师02·随→震六冲", direction: "震荡上涨", weight: 35, summary: "随卦顺势，震六冲放大振幅，路径是高波动偏多。" },
    ],
    ichingEvidence: {
      primaryHexagram: "泽雷随（归魂）",
      changingHexagram: "震为雷（六冲）",
      notes: `原卦题：Lumentum（LITE）8月31号至9月6号走势情况。起卦时间2026-08-16 10:37；${CALENDAR} ${WAVE_SOURCE}`,
    },
  }),

  publish({
    id: "LITE-6W-20260817-V1",
    assetId: "lite",
    forecastType: "MONTH_1",
    periodStart: "2026-08-17",
    periodEnd: "2026-09-30",
    direction: "震荡上涨",
    upProbability: 54,
    sidewaysProbability: 28,
    downProbability: 18,
    summary:
      "老师01看妻财戌土发动后仍化妻财未土，妻财辰土在变卦亦保留为妻财丑土，财爻没有被破坏；但主变卦两头皆为六冲，突发消息与资金快速换手会显著增加。老师02看天雷无妄（六冲）变兑为泽（六冲），方向可上，但过程必然伴随急拉急杀和多次重新定价。",
    expectedPath:
      "锁定路线：8月17–23日高位分歧/回踩 → 8月24–30日资金重新聚集并转强 → 8月底至9月初高波动上行 → 9月继续宽幅震荡抬高。不能用直线主升的仓位和止损方式操作。",
    supportLevels: ["817.57"],
    resistanceLevels: ["1032", "1265"],
    catalysts: ["财爻动变后仍为财", "AI光通信需求", "调整后潜在3浪"],
    risks: ["主变卦双六冲", "急涨急跌", "假突破", "高位追仓"],
    consensusStars: 4,
    consensusLabel: "两位老师共同给出宽幅震荡上行，最大风险来自双六冲而非方向本身",
    methodViews: [
      { id: "lite-6w-t01", label: "老师01·财爻未化坏", direction: "震荡上涨", weight: 65, summary: "财戌土化财未土、财辰土保留为财丑土，中期价格端仍占优。" },
      { id: "lite-6w-t02", label: "老师02·无妄→兑双六冲", direction: "震荡上涨", weight: 35, summary: "方向偏上但突发性极强，波动会反复清洗追涨和追跌仓位。" },
    ],
    ichingEvidence: {
      primaryHexagram: "天雷无妄（六冲）",
      changingHexagram: "兑为泽（六冲）",
      notes: `原卦题：Lumentum（LITE）8月17号到9月30号走势情况。起卦时间2026-08-16 10:38；${CALENDAR} ${WAVE_SOURCE}`,
    },
  }),

  publish({
    id: "LITE-YE-20260817-V1",
    assetId: "lite",
    forecastType: "YEAR_1",
    periodStart: "2026-08-17",
    periodEnd: "2026-12-31",
    direction: "震荡上涨",
    upProbability: 60,
    sidewaysProbability: 25,
    downProbability: 15,
    summary:
      "老师01以10:33的地雷复（六合）→地泽临为正式主版本：世爻妻财子水，变卦妻财亥水临应，申酉金旺阶段可生财水，属于回调后恢复和机会逐渐靠近。10:40同问重起的雷山小过（游魂）→火地晋（游魂）只作旁证，其中兄弟申金发动化妻财卯木，同样支持先小幅反复、后逐步走高，但不重复加权。老师02看复→临为回归和展开，小过→晋为谨慎推进后进阶，两张卦的最终路径一致。",
    expectedPath:
      "到年底主方向为震荡上行：短期先完成2浪/B浪式反复，随后保留3浪推进空间。执行上，817.57有效跌破且反抽不回才需要重算；突破1032并回踩不破后，1265成为主要波段目标，1680只作为长期目标观察。",
    supportLevels: ["817.57"],
    resistanceLevels: ["1032", "1265", "1680"],
    catalysts: ["世财子水", "复→临回调后恢复", "兄弟化财旁证", "波浪3浪预期"],
    risks: ["同问重起独立性不足", "游魂反复", "高估值高波动", "817.57失效"],
    consensusStars: 4,
    consensusLabel: "正式主卦与旁证卦同向看多，但旁证不重复计票；技术位只负责执行",
    methodViews: [
      { id: "lite-ye-t01", label: "老师01·财爻/主旁版本纪律", direction: "震荡上涨", weight: 65, summary: "主版本世财子水、变卦财亥水；旁证兄弟化财，只增强解释，不双倍加权。" },
      { id: "lite-ye-t02", label: "老师02·复→临/小过→晋", direction: "震荡上涨", weight: 35, summary: "复临主回调后恢复，小过晋主谨慎推进后上升，两条路径共同指向年底偏多。" },
    ],
    ichingEvidence: {
      primaryHexagram: "地雷复（六合）",
      changingHexagram: "地泽临",
      notes: `正式主版本原卦题：Lumentum（LITE）8月17至12月31号走势情况，起卦时间2026-08-16 10:33。旁证版本：雷山小过（游魂）→火地晋（游魂），同问起卦时间10:40，仅作旁证、不重复加权。${CALENDAR} ${WAVE_SOURCE}`,
    },
  }),
];

export function listLITEPeriodForecasts20260816(): ConvictionPeriodForecast[] {
  return LITE_LIUYAO_FORECASTS_20260816;
}

export function litePeriodMeta20260816() {
  return LITE_VISIBLE_PERIOD_ORDER.map((type) => ({
    type,
    labelZh: litePeriodLabel20260816(type).zh,
    emptyZh: litePeriodLabel20260816(type).emptyZh,
    hasResearch: LITE_LIUYAO_FORECASTS_20260816.some(
      (item) => item.forecastType === type && item.status === "published",
    ),
  }));
}
