/**
 * BTC multi-horizon Liu Yao research imported from the user's
 * 2026-08-01 source screenshots.
 *
 * Method:
 * 妻财 first, 子孙 second; then 世应、月日旺衰、旬空、伏藏、动变.
 * Hexagram names provide context only and never replace six-relative analysis.
 */
import type {
  ConvictionForecastType,
  ConvictionPeriodForecast,
} from "@/lib/data/conviction/asteroid-forecasts";

const PUBLISHED_AT = "2026-08-01T10:18:00+08:00";

export const BTC_PERIOD_ORDER: ConvictionForecastType[] = [
  "WEEK",
  "WEEK_2",
  "WEEK_3",
  "WEEK_4",
  "MONTH_1",
  "MONTH_3",
  "YEAR_1",
  "YEAR_10",
];

export const BTC_PERIOD_FORECASTS_20260801: ConvictionPeriodForecast[] = [
  {
    id: "BTC-W1-20260801-V2",
    assetId: "bitcoin",
    forecastType: "WEEK",
    periodStart: "2026-08-01",
    periodEnd: "2026-08-09",
    direction: "震荡",
    upProbability: 30,
    sidewaysProbability: 45,
    downProbability: 25,
    summary:
      "8月上旬以震荡和弱修复为主。妻财子水伏藏在兄弟未土之下，资金力量受压；子孙酉金持世可带来修复，但父母巳火发动化官鬼寅木，技术和消息风险仍会反复出现。",
    expectedPath:
      "上旬先整理，期间可能反弹，但难形成持续单边大涨；8月7日前后进入波动放大和方向重新选择窗口。",
    supportLevels: [],
    resistanceLevels: [],
    riskLevel: "高",
    catalysts: ["子孙酉金持世", "申月临近后金气增强"],
    risks: ["财爻伏藏受兄弟压制", "父母动化官鬼", "反弹持续性不足"],
    consensusStars: 3,
    consensusLabel: "与ETH上旬卦一致：先难后修复，但BTC资金结构更受压",
    methodViews: [
      {
        id: "btc-liuyiao-w1",
        label: "六爻·BTC",
        direction: "震荡",
        weight: 90,
        summary: "财伏兄下，子孙持世可修复，父母动化官鬼限制持续性。",
      },
      {
        id: "eth-cross-w1",
        label: "ETH交叉印证",
        direction: "先跌后涨",
        weight: 10,
        summary: "ETH同期同样指向上旬先难、立秋前后修复。",
      },
    ],
    ichingEvidence: {
      primaryHexagram: "火泽睽",
      changingHexagram: "火水未济",
      notes:
        "妻财子水伏于兄弟未土之下；子孙酉金持世；父母巳火发动化官鬼寅木。财弱而修复力量存在。",
    },
    version: 2,
    status: "published",
    sourceType: "ICHING_RESEARCH",
    publishedAt: PUBLISHED_AT,
    lockedAt: PUBLISHED_AT,
    validationStatus: "UNVERIFIED",
  },
  {
    id: "BTC-W2-20260810-V2",
    assetId: "bitcoin",
    forecastType: "WEEK_2",
    periodStart: "2026-08-10",
    periodEnd: "2026-08-16",
    direction: "震荡上涨",
    upProbability: 55,
    sidewaysProbability: 25,
    downProbability: 20,
    summary:
      "这是BTC八月相对最强的窗口。妻财酉金明现，进入申月后得到月令扶助；兄弟巳火持世但在申月力量下降，克财能力减弱。六冲和游魂仍提示上涨过程中会出现快速回撤。",
    expectedPath:
      "8月10日至16日更容易出现明显反弹或快速上冲，但路径不会平滑，应防范大阳线后的剧烈回撤。",
    supportLevels: [],
    resistanceLevels: [],
    riskLevel: "高",
    catalysts: ["申月扶助财爻金", "兄弟火克财力量下降"],
    risks: ["六冲快速反转", "游魂持续性不足", "上涨后获利兑现"],
    consensusStars: 4,
    consensusLabel: "BTC与ETH高度一致：8月中旬均为八月最强窗口",
    methodViews: [
      {
        id: "btc-liuyiao-w2",
        label: "六爻·BTC",
        direction: "震荡上涨",
        weight: 90,
        summary: "财酉金得申月扶助，兄弟巳火持世但失令。",
      },
      {
        id: "eth-cross-w2",
        label: "ETH交叉印证",
        direction: "震荡上涨",
        weight: 10,
        summary: "ETH同期同为离卦，财酉金得申月扶助，方向高度一致。",
      },
    ],
    ichingEvidence: {
      primaryHexagram: "离为火",
      changingHexagram: "雷山小过",
      notes:
        "妻财酉金明现，申月扶财；兄弟巳火持世但失令。六冲化游魂，方向偏强、波动极大。",
    },
    version: 2,
    status: "published",
    sourceType: "ICHING_RESEARCH",
    publishedAt: PUBLISHED_AT,
    lockedAt: PUBLISHED_AT,
    validationStatus: "UNVERIFIED",
  },
  {
    id: "BTC-W3-20260817-V2",
    assetId: "bitcoin",
    forecastType: "WEEK_3",
    periodStart: "2026-08-17",
    periodEnd: "2026-08-23",
    direction: "震荡下跌",
    upProbability: 20,
    sidewaysProbability: 25,
    downProbability: 55,
    summary:
      "妻财寅木持世但逢旬空，进入申月后又受申金冲克；子孙亥水发动化兄弟申金，官鬼午火发动化兄弟酉金，推动力量和风险爻最终都转为兄弟抛压。",
    expectedPath:
      "若8月中旬已经明显上涨，本周更容易出现回撤和高位兑现；反弹力度下降，方向转弱。",
    supportLevels: [],
    resistanceLevels: [],
    riskLevel: "高",
    catalysts: ["下跌后的短线技术反抽"],
    risks: ["财寅木空亡并受申冲", "子孙化兄弟", "官鬼化兄弟"],
    consensusStars: 2,
    consensusLabel: "与ETH出现分歧：BTC转弱，ETH财爻持世，ETH相对更强",
    methodViews: [
      {
        id: "btc-liuyiao-w3",
        label: "六爻·BTC",
        direction: "震荡下跌",
        weight: 90,
        summary: "财爻空且受冲，子孙与官鬼均化兄弟，抛压增强。",
      },
      {
        id: "eth-cross-w3",
        label: "ETH交叉印证",
        direction: "震荡上涨",
        weight: 10,
        summary: "ETH同期财戌土持世、财辰土同现，因此不是共同看空，而是相对强弱分化。",
      },
    ],
    ichingEvidence: {
      primaryHexagram: "泽水困",
      changingHexagram: "水风井",
      notes:
        "财寅木持世但空亡，申月冲寅；子孙亥水动化兄弟申金，官鬼午火动化兄弟酉金。",
    },
    version: 2,
    status: "published",
    sourceType: "ICHING_RESEARCH",
    publishedAt: PUBLISHED_AT,
    lockedAt: PUBLISHED_AT,
    validationStatus: "UNVERIFIED",
  },
  {
    id: "BTC-W4-20260824-V2",
    assetId: "bitcoin",
    forecastType: "WEEK_4",
    periodStart: "2026-08-24",
    periodEnd: "2026-08-30",
    direction: "探底回升",
    upProbability: 35,
    sidewaysProbability: 40,
    downProbability: 25,
    summary:
      "妻财未土发动化妻财戌土，财爻仍有延续；妻财丑土临应，但父母亥水持世，市场更依赖技术结构、消息和确认，主动追涨力量不足。",
    expectedPath:
      "前一周回撤后，本周更容易企稳、整理或弱修复；反弹存在，但暂不定义为新一轮主升。",
    supportLevels: [],
    resistanceLevels: [],
    riskLevel: "中高",
    catalysts: ["财爻连续", "前期风险释放后的修复"],
    risks: ["父母持世", "游魂结构", "主动追涨不足"],
    consensusStars: 3,
    consensusLabel: "与ETH方向一致：下旬风险释放后修复，ETH修复强度略高",
    methodViews: [
      {
        id: "btc-liuyiao-w4",
        label: "六爻·BTC",
        direction: "探底回升",
        weight: 90,
        summary: "财未土动化财戌土，但父母持世，修复需技术确认。",
      },
      {
        id: "eth-cross-w4",
        label: "ETH交叉印证",
        direction: "探底回升",
        weight: 10,
        summary: "ETH同期官鬼动化财，亦为先风险释放后修复。",
      },
    ],
    ichingEvidence: {
      primaryHexagram: "泽风大过",
      changingHexagram: "天风姤",
      notes:
        "妻财未土发动化妻财戌土，妻财丑土临应；父母亥水持世。财仍在，但追涨意愿受技术和消息约束。",
    },
    version: 2,
    status: "published",
    sourceType: "ICHING_RESEARCH",
    publishedAt: PUBLISHED_AT,
    lockedAt: PUBLISHED_AT,
    validationStatus: "UNVERIFIED",
  },
  {
    id: "BTC-M1-20260801-V2",
    assetId: "bitcoin",
    forecastType: "MONTH_1",
    periodStart: "2026-08-01",
    periodEnd: "2026-08-31",
    direction: "先涨后跌",
    upProbability: 33,
    sidewaysProbability: 39,
    downProbability: 28,
    summary:
      "八月月卦兄弟丑土持世发动化兄弟酉金，父母巳火发动后同样化兄弟丑土，动爻最终强化兄弟力量。月内并非持续上涨，更接近上旬整理、中旬反弹、下旬回撤后弱修复。",
    expectedPath:
      "上旬震荡整理 → 8月中旬明显反弹 → 8月17日至23日转弱回撤 → 月底企稳或弱修复。",
    supportLevels: [],
    resistanceLevels: [],
    riskLevel: "高",
    catalysts: ["8月中旬申月扶财"],
    risks: ["兄弟持世且动变强化", "月内冲高后兑现", "宽幅震荡"],
    consensusStars: 3,
    consensusLabel: "BTC与ETH月度都不支持单边牛市；共同指向先弱后有修复窗口",
    methodViews: [
      {
        id: "btc-liuyiao-m1",
        label: "六爻·BTC月度",
        direction: "先涨后跌",
        weight: 90,
        summary: "兄弟持世、动变再化兄弟，月度抛压不轻。",
      },
      {
        id: "eth-cross-m1",
        label: "ETH月度对照",
        direction: "先跌后涨",
        weight: 10,
        summary: "ETH月卦财弱但分段卦中后段修复，二者共同确认八月宽幅震荡而非单边上涨。",
      },
    ],
    ichingEvidence: {
      primaryHexagram: "山泽损",
      changingHexagram: "山风蛊",
      notes:
        "兄弟丑土持世发动化兄弟酉金；父母巳火发动化兄弟丑土。妻财子水虽上卦但未发动。",
    },
    version: 2,
    status: "published",
    sourceType: "ICHING_RESEARCH",
    publishedAt: PUBLISHED_AT,
    lockedAt: PUBLISHED_AT,
    validationStatus: "UNVERIFIED",
  },
  {
    id: "BTC-M3-20260801-V2",
    assetId: "bitcoin",
    forecastType: "MONTH_3",
    periodStart: "2026-08-01",
    periodEnd: "2026-10-31",
    direction: "震荡",
    upProbability: 42,
    sidewaysProbability: 30,
    downProbability: 28,
    summary:
      "三个月静卦妻财辰土持世、妻财未土临应，说明中期并非持续崩跌，仍有资金支撑；结合月度分卦，更接近八月反弹、八月底至九月上旬形成阶段高点或转折、九月中下旬转弱、十月再修复。",
    archiveSummary:
      "三个月：八月反弹，八月底至九月上旬高点窗口，九月中下旬转弱，十月修复。",
    expectedPath:
      "8月修复抬升 → 8月底至9月上旬阶段高点或转折 → 9月中下旬回落 → 10月重新修复。",
    supportLevels: [],
    resistanceLevels: [],
    riskLevel: "高",
    catalysts: ["财爻持世", "十月财土重新得势"],
    risks: ["九月酉金旺而克财木", "阶段高点后的回撤", "三个月内多轮切换"],
    consensusStars: 3,
    consensusLabel: "部分一致：两者均支持八月反弹和秋季转折，ETH可能比BTC强到更晚",
    methodViews: [
      {
        id: "btc-liuyiao-m3",
        label: "六爻·BTC三个月",
        direction: "震荡",
        weight: 90,
        summary: "财辰土持世、财未土临应，中期有支撑但节奏多变。",
      },
      {
        id: "eth-cross-m3",
        label: "ETH三个月对照",
        direction: "震荡上涨",
        weight: 10,
        summary: "ETH三个月卦偏强至9月，但同样提示10月结构变化和回撤风险。",
      },
    ],
    ichingEvidence: {
      primaryHexagram: "泽雷随",
      changingHexagram: null,
      notes:
        "静卦归魂。妻财辰土持世、妻财未土临应；结合九月天山遁静卦，阶段高点更可能在八月底至九月上旬。",
    },
    version: 2,
    status: "published",
    sourceType: "ICHING_RESEARCH",
    publishedAt: PUBLISHED_AT,
    lockedAt: PUBLISHED_AT,
    validationStatus: "UNVERIFIED",
  },
  {
    id: "BTC-Y1-20260801-V2",
    assetId: "bitcoin",
    forecastType: "YEAR_1",
    periodStart: "2026-08-01",
    periodEnd: "2027-08-01",
    direction: "震荡上涨",
    upProbability: 48,
    sidewaysProbability: 28,
    downProbability: 24,
    summary:
      "一年卦主卦妻财申金明现，变卦妻财酉金持世，说明未来一年资本、机构配置和金融属性仍有支撑；官鬼亥水持世转为子孙辰土，系统性风险存在向修复力量转化的条件。父母寅卯木空亡，政策与叙事并非持续主导。",
    archiveSummary:
      "一年：高波动震荡后仍偏向抬升，BTC相对ETH更具韧性。",
    expectedPath:
      "未来一年不会平滑上涨，仍会经历多次深度回撤；但在申酉财爻和变卦财爻持世结构下，全年重心具备重新抬升条件。",
    supportLevels: [],
    resistanceLevels: [],
    riskLevel: "高",
    catalysts: ["妻财申金明现", "变卦妻财酉金持世", "风险爻转子孙"],
    risks: ["高波动回撤", "官鬼亥水风险", "父母空亡导致政策预期反复"],
    consensusStars: 3,
    consensusLabel: "与ETH一年卦分化：BTC偏韧性上行，ETH前强后弱、调整风险更高",
    methodViews: [
      {
        id: "btc-liuyiao-y1",
        label: "六爻·BTC一年",
        direction: "震荡上涨",
        weight: 90,
        summary: "主卦财申、变卦财酉持世，未来一年仍有资金支撑。",
      },
      {
        id: "eth-cross-y1",
        label: "ETH一年对照",
        direction: "先涨后跌",
        weight: 10,
        summary: "ETH财寅木动化兄弟酉金并受回头克，后程调整风险明显高于BTC。",
      },
    ],
    ichingEvidence: {
      primaryHexagram: "天火同人",
      changingHexagram: "泽天夬",
      notes:
        "主卦妻财申金明现；变卦妻财酉金持世。官鬼亥水持世后转子孙辰土。未来一年BTC结构明显强于ETH。",
    },
    version: 2,
    status: "published",
    sourceType: "ICHING_RESEARCH",
    publishedAt: PUBLISHED_AT,
    lockedAt: PUBLISHED_AT,
    validationStatus: "UNVERIFIED",
  },
  {
    id: "BTC-Y10-20260801-V1",
    assetId: "bitcoin",
    forecastType: "YEAR_10",
    periodStart: "2026-08-01",
    periodEnd: "2036-08-01",
    direction: "震荡上涨",
    upProbability: 45,
    sidewaysProbability: 30,
    downProbability: 25,
    summary:
      "十年卦两处妻财卯木同现，说明BTC的财富和价值属性不会消失；但卯木逢旬空，其中一处财爻发动化兄弟酉金并受回头克，代表每轮财富扩张都会被竞争、流动性收缩和获利兑现削弱。父母未土持世且旺，说明制度、监管、托管、技术基础设施和机构规则将成为长期主导。变卦巽为风六冲，意味着全球渗透与传播持续，但十年内会反复经历剧烈牛熊和制度冲击。",
    archiveSummary:
      "十年：BTC大概率存续并继续全球金融化，但不是十年直线上涨，而是多轮扩张、危机、回撤和再制度化。",
    expectedPath:
      "前期继续扩散和机构化 → 中期经历监管、流动性或技术冲击 → 每轮深度回撤后由更成熟的规则和基础设施推动下一轮扩张。无法仅凭本卦精确分配到每个具体年份。",
    supportLevels: [],
    resistanceLevels: [],
    riskLevel: "高",
    catalysts: ["父母持世代表制度化和基础设施", "财爻两现", "观化巽代表传播与渗透"],
    risks: ["财爻空亡", "财化兄弟回头克", "巽为风六冲", "多轮80%级别或类似深度回撤风险"],
    consensusStars: 4,
    consensusLabel: "与ETH十年卦相互印证：两者均存续并周期扩张，但BTC长期结构更强、ETH约束更多",
    methodViews: [
      {
        id: "btc-liuyiao-y10",
        label: "六爻·BTC十年",
        direction: "震荡上涨",
        weight: 90,
        summary: "财爻两现，父母持世，观化巽六冲；长期存续和金融化伴随多轮剧烈牛熊。",
      },
      {
        id: "eth-cross-y10",
        label: "ETH十年对照",
        direction: "震荡上涨",
        weight: 10,
        summary: "ETH风险可化财，但财又化兄弟，说明存续扩张同时被竞争和成本反复消耗。",
      },
    ],
    ichingEvidence: {
      primaryHexagram: "风地观",
      changingHexagram: "巽为风",
      notes:
        "两处妻财卯木，其中一处发动化兄弟酉金并受回头克；父母未土持世且旺；变卦巽为风六冲。长期制度化、全球渗透和剧烈周期并存。",
    },
    version: 1,
    status: "published",
    sourceType: "ICHING_RESEARCH",
    publishedAt: PUBLISHED_AT,
    lockedAt: PUBLISHED_AT,
    validationStatus: "UNVERIFIED",
  },
];

export function listBtcPeriodForecasts20260801(): ConvictionPeriodForecast[] {
  return BTC_PERIOD_FORECASTS_20260801.filter((item) => item.status === "published");
}

export function listBtcAdminCycleForecasts20260801(): ConvictionPeriodForecast[] {
  return listBtcPeriodForecasts20260801().filter(
    (item) =>
      item.forecastType.startsWith("WEEK") ||
      item.forecastType === "MONTH_1" ||
      item.forecastType === "MONTH_3"
  );
}
