/**
 * ETH multi-horizon Liu Yao research imported from the user's
 * 2026-07-31 source screenshots.
 *
 * Interpretation follows the MOOX teacher method:
 * 财爻 first, 子孙 second; then 世应, 月日旺衰, 旬空, 动变.
 * Hexagram names are supporting context only.
 */
import {
  ASTEROID_PERIOD_LABELS,
  type ConvictionForecastType,
  type ConvictionPeriodForecast,
} from "@/lib/data/conviction/asteroid-forecasts";

export const ETH_VISIBLE_PERIOD_ORDER: ConvictionForecastType[] = ["WEEK", "WEEK_2", "MONTH_1"];

export const ETH_PERIOD_ORDER: ConvictionForecastType[] = [
  "WEEK",
  "WEEK_2",
  "WEEK_3",
  "WEEK_4",
  "MONTH_1",
  "MONTH_3",
  "YEAR_1",
  "YEAR_3",
  "YEAR_10",
];

const PUBLISHED_AT = "2026-07-31T20:55:00+08:00";

export const ETH_PERIOD_FORECASTS: ConvictionPeriodForecast[] = [
  {
    id: "ETH-W1-20260801-V1",
    assetId: "eth",
    forecastType: "WEEK",
    periodStart: "2026-08-01",
    periodEnd: "2026-08-09",
    direction: "先跌后涨",
    upProbability: 38,
    sidewaysProbability: 37,
    downProbability: 25,
    summary:
      "8月上旬先难后缓。财爻午火伏藏，虽得时令余气但释放受阻；子孙寅木持世而旬空，前段推动力不足。立秋前后冲空触发后，反弹和修复机会增加。",
    expectedPath: "8月1日至6日偏弱震荡，8月7日前后波动放大，随后出现修复，但不定义为单边突破。",
    supportLevels: [],
    resistanceLevels: [],
    riskLevel: "高",
    catalysts: ["立秋前后冲空触发", "子孙生财条件改善"],
    risks: ["财爻伏藏", "世爻旬空", "上旬反弹持续性有限"],
    consensusStars: 3,
    consensusLabel: "六爻短期先弱，周期模块对更长阶段偏多",
    methodViews: [
      { id: "eth-liuyiao-week", label: "六爻·阶段", direction: "先跌后涨", weight: 85, summary: "财爻伏藏、世爻旬空，立秋前后冲空后再看修复。" },
      { id: "eth-cycle", label: "周期观察", direction: "震荡上涨", weight: 15, summary: "外部周期观点将2026年6月至7月视为潜在大周期低点，但只作低权重背景。" },
    ],
    keyDates: [
      {
        date: "2026-08-07",
        ganzhi: "癸丑日",
        type: "波动放大",
        label: "立秋前后冲空与修复观察窗口",
        source: "LIUYAO",
        confidence: 65,
        note: "原始分段判断指向8月7日前后先放大波动、再观察反弹修复；不表述为必涨日。",
      },
    ],
    ichingEvidence: {
      primaryHexagram: "水雷屯",
      changingHexagram: "风雷益",
      notes:
        "世爻子孙寅木旬空；财爻午火伏于官鬼辰土之下。先看阻滞，再看冲空后的修复，卦名仅作辅助。",
    },
    version: 1,
    status: "published",
    sourceType: "ICHING_RESEARCH",
    publishedAt: PUBLISHED_AT,
    lockedAt: PUBLISHED_AT,
    validationStatus: "UNVERIFIED",
  },
  {
    id: "ETH-W2-20260810-V1",
    assetId: "eth",
    forecastType: "WEEK_2",
    periodStart: "2026-08-10",
    periodEnd: "2026-08-16",
    direction: "震荡上涨",
    upProbability: 48,
    sidewaysProbability: 31,
    downProbability: 21,
    summary:
      "中旬是8月相对更强的窗口。财爻酉金明现，在申月得到扶助；兄弟巳火持世但在申月力量下降，克财能力减弱。官鬼亥水同时受生，意味着上涨伴随快速回撤。",
    expectedPath: "高波动上冲与回撤交替，偏向震荡抬升；六冲结构下不适合按单边行情理解。",
    supportLevels: [],
    resistanceLevels: [],
    riskLevel: "高",
    catalysts: ["申月扶财", "兄弟爻克财力量减弱"],
    risks: ["六冲快速反转", "官鬼亥水风险同步增强"],
    ichingEvidence: {
      primaryHexagram: "离为火",
      changingHexagram: null,
      notes:
        "财爻酉金得申月之助；兄弟巳火持世但月令不旺。静卦六冲，方向偏强但路径非常不稳。",
    },
    rollingUpdate: {
      asOf: "2026-08-08T08:38:00+08:00",
      label: "8/8外部技术交叉验证（不改锁定方向）",
      summary:
        "外部技术视频把ETH的1–3天结构定义为震荡消化/回调优先：两小时MACD顶背离已经死叉，若继续冲高也更偏向滞涨或诱多；6小时级别给出的回调参考在约1,860附近。该观点同时认为周线此前存在大级别MACD底背离，因此把更长到一个月的路径仍定义为‘调整之后上涨’。MOOX不据此改写8/10–16原V1的震荡上涨，只把执行节奏收紧为‘短线先消化，随后再验证中旬强势窗口是否启动’。",
      originalLockedView: "8/10–16原V1：震荡上涨，中旬是8月相对更强的窗口，但静卦六冲意味着路径非常不稳。",
      timingTolerance: "1,860仅记录外部技术视频的6小时回调参考，不是MOOX硬目标；必须结合实时ETH价格与结构重新确认。",
    },
    version: 1,
    status: "published",
    sourceType: "ICHING_RESEARCH",
    publishedAt: PUBLISHED_AT,
    lockedAt: PUBLISHED_AT,
    validationStatus: "UNVERIFIED",
  },
  {
    id: "ETH-W3-20260817-V1",
    assetId: "eth",
    forecastType: "WEEK_3",
    periodStart: "2026-08-17",
    periodEnd: "2026-08-23",
    direction: "震荡上涨",
    upProbability: 45,
    sidewaysProbability: 33,
    downProbability: 22,
    summary:
      "财爻戌土持世，另有财爻辰土，财爻双现且持世；兄弟寅木在申月受冲，克财作用减弱。子孙巳火发动后受回头克，说明上行仍会反复。",
    expectedPath: "延续修复和抬升，但游魂结构使行情容易来回，冲高后可能多次回踩。",
    supportLevels: [],
    resistanceLevels: [],
    riskLevel: "中高",
    catalysts: ["财爻持世", "兄弟爻受申月冲制"],
    risks: ["子孙动化父母子水回头克", "游魂结构持续性不足"],
    ichingEvidence: {
      primaryHexagram: "山雷颐",
      changingHexagram: "风雷益",
      notes:
        "财爻戌土持世、财爻辰土同现；子孙巳火动化父母子水，生财动力有反复。",
    },
    version: 1,
    status: "published",
    sourceType: "ICHING_RESEARCH",
    publishedAt: PUBLISHED_AT,
    lockedAt: PUBLISHED_AT,
    validationStatus: "UNVERIFIED",
  },
  {
    id: "ETH-W4-20260824-V1",
    assetId: "eth",
    forecastType: "WEEK_4",
    periodStart: "2026-08-24",
    periodEnd: "2026-08-30",
    direction: "探底回升",
    upProbability: 43,
    sidewaysProbability: 34,
    downProbability: 23,
    summary:
      "财爻未土持世，官鬼酉金发动化财戌土。风险爻先动，容易先出现剧烈震荡；随后官鬼化财，具备风险释放后转为修复的条件。",
    expectedPath: "先震荡或下探，随后回升；若直接急涨，也更容易在高位进入整理。",
    supportLevels: [],
    resistanceLevels: [],
    riskLevel: "高",
    catalysts: ["官鬼动化财", "财爻持世"],
    risks: ["申月官鬼酉金旺", "突破后进入颐卦整理"],
    ichingEvidence: {
      primaryHexagram: "火雷噬嗑",
      changingHexagram: "山雷颐",
      notes:
        "财爻未土持世；官鬼酉金发动化财戌土。先处理风险，再看修复和整理。",
    },
    version: 1,
    status: "published",
    sourceType: "ICHING_RESEARCH",
    publishedAt: PUBLISHED_AT,
    lockedAt: PUBLISHED_AT,
    validationStatus: "UNVERIFIED",
  },
  {
    id: "ETH-M1-20260801-V1",
    assetId: "eth",
    forecastType: "MONTH_1",
    periodStart: "2026-08-01",
    periodEnd: "2026-08-31",
    direction: "先跌后涨",
    upProbability: 35,
    sidewaysProbability: 40,
    downProbability: 25,
    summary:
      "8月月度财爻子水在未月受克，又逢午日冲破；子孙申金持世但受月日压制，兄弟土旺克财。月度总势不强。分段卦显示上旬先难，中旬和下旬存在交易性修复。",
    expectedPath: "前弱—中旬剧烈上冲与回撤—下旬修复。月内有上涨窗口，但月度收官未必形成持续大涨。",
    supportLevels: [],
    resistanceLevels: [],
    riskLevel: "高",
    catalysts: ["8月中下旬申月扶助财爻金", "分段卦财爻持世"],
    risks: ["月卦财爻子水日破月克", "兄弟土旺", "变卦咸显示外部情绪牵引增强"],
    consensusStars: 3,
    consensusLabel: "月卦偏弱，分段卦与周期观点支持中后段修复",
    methodViews: [
      { id: "eth-liuyiao-month", label: "六爻·月度", direction: "先跌后涨", weight: 80, summary: "月卦财弱、兄弟旺；分段卦显示中旬和下旬仍有修复窗口。" },
      { id: "eth-cycle-month", label: "周期观察", direction: "震荡上涨", weight: 20, summary: "长期周期观点偏多，但不替代月度六爻和技术验证。" },
    ],
    ichingEvidence: {
      primaryHexagram: "风山渐",
      changingHexagram: "泽山咸",
      notes:
        "截图主卦标注风山渐（归魂），变卦泽山咸；财爻子水弱，子孙申金持世但不旺，兄弟土旺。按六亲旺衰判断月度偏弱，卦名只作辅助。",
    },
    version: 1,
    status: "published",
    sourceType: "ICHING_RESEARCH",
    publishedAt: PUBLISHED_AT,
    lockedAt: PUBLISHED_AT,
    validationStatus: "UNVERIFIED",
  },
  {
    id: "ETH-M3-20260801-V1",
    assetId: "eth",
    forecastType: "MONTH_3",
    periodStart: "2026-08-01",
    periodEnd: "2026-10-30",
    direction: "震荡上涨",
    upProbability: 50,
    sidewaysProbability: 29,
    downProbability: 21,
    summary:
      "三个月卦中子孙未土发动化财酉金，兄弟巳火发动化子孙未土，属于克财力量转为生财、子孙再化财的正向链条。申酉月对财爻酉金最有利，但六冲和变革结构意味着涨幅伴随大幅波动。",
    archiveSummary: "三个月：8月至9月偏强，10月结构变化和回撤风险上升。",
    expectedPath: "8月至9月偏强，9月更容易出现阶段高点；10月进入结构变化和回撤风险上升阶段。",
    supportLevels: [],
    resistanceLevels: [],
    riskLevel: "高",
    catalysts: ["子孙动化财", "兄弟动化子孙", "申酉月扶财"],
    risks: ["六冲结构", "泽火革代表结构切换", "10月后风险上升"],
    ichingEvidence: {
      primaryHexagram: "离为火",
      changingHexagram: "泽火革",
      notes:
        "兄弟巳火动化子孙未土；子孙未土动化妻财酉金。中期偏多，但不是平滑上涨。",
    },
    version: 1,
    status: "published",
    sourceType: "ICHING_RESEARCH",
    publishedAt: PUBLISHED_AT,
    lockedAt: PUBLISHED_AT,
    validationStatus: "UNVERIFIED",
  },
  {
    id: "ETH-Y1-20260801-V1",
    assetId: "eth",
    forecastType: "YEAR_1",
    periodStart: "2026-08-01",
    periodEnd: "2027-08-01",
    direction: "先涨后跌",
    upProbability: 30,
    sidewaysProbability: 25,
    downProbability: 45,
    summary:
      "一年卦中财爻寅木发动化兄弟酉金，资金由财转兄，是阶段利润转为竞争和抛压的明显信号；主卦剥、变卦坤六冲进一步提示后程承压。",
    archiveSummary: "一年：前段可冲高，后程因财化兄转入较长调整。",
    expectedPath: "前段可延续三个月级别的上涨或冲高，随后进入较长调整；全年不支持持续单边上涨。",
    supportLevels: [],
    resistanceLevels: [],
    riskLevel: "高",
    catalysts: ["前期三个月正向动变链条"],
    risks: ["财化兄弟", "剥卦后程剥落", "坤为地六冲"],
    ichingEvidence: {
      primaryHexagram: "山地剥",
      changingHexagram: "坤为地",
      notes:
        "财爻寅木发动化兄弟酉金；子孙子水持世但不足以抵消财化兄的中期压力。",
    },
    version: 1,
    status: "published",
    sourceType: "ICHING_RESEARCH",
    publishedAt: PUBLISHED_AT,
    lockedAt: PUBLISHED_AT,
    validationStatus: "UNVERIFIED",
  },
  {
    id: "ETH-Y3-20260801-V1",
    assetId: "eth",
    forecastType: "YEAR_3",
    periodStart: "2026-08-01",
    periodEnd: "2029-08-01",
    direction: "先涨后跌",
    upProbability: 42,
    sidewaysProbability: 26,
    downProbability: 32,
    summary:
      "三年卦财爻子水持世、财爻亥水明现，兄弟辰土发动化财亥水，说明经历低谷后仍有一轮较强复苏；但变卦明夷游魂提示复苏之后仍会出现明显压制和深度回撤。",
    archiveSummary: "三年：先复苏，后经历一次明显压制和深度回撤。",
    expectedPath: "先进入回归和复苏周期，再经历一轮较大的牛熊切换；不适合按三年直线上涨理解。",
    supportLevels: [],
    resistanceLevels: [],
    riskLevel: "高",
    catalysts: ["财爻持世", "兄弟动化财", "复卦六合"],
    risks: ["明夷后段受压", "游魂结构", "大周期深度回撤"],
    ichingEvidence: {
      primaryHexagram: "地雷复",
      changingHexagram: "地火明夷",
      notes:
        "财爻子水持世、财爻亥水同现；兄弟辰土发动化财亥水。先复苏，后受压。",
    },
    version: 1,
    status: "published",
    sourceType: "ICHING_RESEARCH",
    publishedAt: PUBLISHED_AT,
    lockedAt: PUBLISHED_AT,
    validationStatus: "UNVERIFIED",
  },
  {
    id: "ETH-Y10-20260801-V1",
    assetId: "eth",
    forecastType: "YEAR_10",
    periodStart: "2026-08-01",
    periodEnd: "2036-08-01",
    direction: "震荡上涨",
    upProbability: 42,
    sidewaysProbability: 32,
    downProbability: 26,
    summary:
      "十年卦官鬼寅木发动化财子水，说明系统性风险中仍能转化出价值；但财爻子水发动化兄弟戌土，代表财富会在竞争、周期和成本中反复被消耗。长期更像存续并周期扩张，而不是无回撤的十年单边牛市。",
    archiveSummary: "十年：可存续并周期扩张，但财富会在竞争和周期中反复消耗。",
    expectedPath: "多轮上涨、监管约束和深度回撤交替。长期持有价值取决于周期管理，而不是简单买入后不动。",
    supportLevels: [],
    resistanceLevels: [],
    riskLevel: "高",
    catalysts: ["风险动化财", "水泽节六合的长期存续性"],
    risks: ["财动化兄弟", "竞争和监管约束", "多轮大幅回撤"],
    ichingEvidence: {
      primaryHexagram: "山泽损",
      changingHexagram: "水泽节",
      notes:
        "官鬼寅木动化财子水；财子水动化兄弟戌土。长期价值和财富消耗同时存在。",
    },
    version: 1,
    status: "published",
    sourceType: "ICHING_RESEARCH",
    publishedAt: PUBLISHED_AT,
    lockedAt: PUBLISHED_AT,
    validationStatus: "UNVERIFIED",
  },
];

export function listEthPeriodForecasts(): ConvictionPeriodForecast[] {
  return ETH_PERIOD_FORECASTS.filter((f) => f.status === "published");
}

export function ethPeriodMeta() {
  return ETH_VISIBLE_PERIOD_ORDER.map((type) => ({
    type,
    labelZh: type === "WEEK" ? "本周" : "1个月",
    emptyZh: ASTEROID_PERIOD_LABELS[type].emptyZh,
    hasResearch: Boolean(listEthPeriodForecasts().find((f) => f.forecastType === type)),
  }));
}
