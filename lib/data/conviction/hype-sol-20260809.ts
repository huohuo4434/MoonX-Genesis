import {
  ASTEROID_PERIOD_LABELS,
  type ConvictionForecastType,
  type ConvictionPeriodForecast,
} from "@/lib/data/conviction/asteroid-forecasts";
import { listMuHypePeriodForecasts } from "@/lib/data/conviction/mu-hype-forecasts";

const PUBLISHED_AT = "2026-08-09T17:05:00+08:00";

export const HYPE_UPDATED_PERIOD_ORDER: ConvictionForecastType[] = [
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

export const HYPE_UPDATED_VISIBLE_PERIOD_ORDER: ConvictionForecastType[] = [
  "WEEK_2",
  "WEEK_3",
  "WEEK_4",
  "MONTH_1",
  "MONTH_3",
  "YEAR_1",
  "YEAR_3",
  "YEAR_10",
];

export const HYPE_UPDATED_PERIOD_LABELS: Partial<
  Record<ConvictionForecastType, { zh: string; en: string; emptyZh: string }>
> = {
  WEEK: { zh: "原周卦", en: "Prior week", emptyZh: "该周期预测尚未发布" },
  WEEK_2: { zh: "8/9–16", en: "Aug 9–16", emptyZh: "8/9–16周卦尚未发布" },
  WEEK_3: { zh: "8/17–23", en: "Aug 17–23", emptyZh: "8/17–23周卦尚未发布" },
  WEEK_4: { zh: "8/23–31", en: "Aug 23–31", emptyZh: "8/23–31周卦尚未发布" },
  MONTH_1: { zh: "8月", en: "August", emptyZh: "8月研究尚未发布" },
  MONTH_3: { zh: "9–12月", en: "Sep–Dec", emptyZh: "9–12月研究尚未发布" },
  YEAR_1: { zh: "未来1年", en: "1Y", emptyZh: "1年研究尚未发布" },
  YEAR_3: { zh: "2027年", en: "2027", emptyZh: "2027年度研究尚未发布" },
  YEAR_10: { zh: "10年", en: "10Y", emptyZh: "10年研究尚未发布" },
};

export const SOL_PERIOD_ORDER: ConvictionForecastType[] = [
  "WEEK",
  "WEEK_2",
  "WEEK_3",
  "MONTH_1",
  "MONTH_3",
  "YEAR_1",
  "YEAR_3",
  "YEAR_10",
];

export const SOL_VISIBLE_PERIOD_ORDER: ConvictionForecastType[] = [
  "WEEK",
  "WEEK_2",
  "WEEK_3",
  "MONTH_1",
  "MONTH_3",
  "YEAR_1",
  "YEAR_3",
  "YEAR_10",
];

export const SOL_PERIOD_LABELS: Partial<
  Record<ConvictionForecastType, { zh: string; en: string; emptyZh: string }>
> = {
  WEEK: { zh: "8/9–16", en: "Aug 9–16", emptyZh: "8/9–16周卦尚未发布" },
  WEEK_2: { zh: "8/17–23", en: "Aug 17–23", emptyZh: "8/17–23周卦尚未发布" },
  WEEK_3: { zh: "8/24–30", en: "Aug 24–30", emptyZh: "8/24–30周卦尚未发布" },
  MONTH_1: { zh: "8月", en: "August", emptyZh: "8月研究尚未发布" },
  MONTH_3: { zh: "9–12月", en: "Sep–Dec", emptyZh: "9–12月路线尚未发布" },
  YEAR_1: { zh: "2027年", en: "2027", emptyZh: "2027年度研究尚未发布" },
  YEAR_3: { zh: "2028年", en: "2028", emptyZh: "2028年度研究尚未发布" },
  YEAR_10: { zh: "10年", en: "10Y", emptyZh: "10年研究尚未发布" },
};

export const HYPE_UPDATE_FORECASTS_20260809: ConvictionPeriodForecast[] = [
  {
    id: "HYPE-W2-20260809-V3",
    assetId: "hype",
    forecastType: "WEEK_2",
    periodStart: "2026-08-09",
    periodEnd: "2026-08-16",
    direction: "上涨",
    upProbability: 56,
    sidewaysProbability: 28,
    downProbability: 16,
    summary:
      "老师01按六亲旺衰看，目标周已经进入申月，妻财子水得申金生扶，伏藏子孙申金当令，世爻兄弟丑土克财力量反而退弱；老师02按主卦秩序看，山泽损静卦更像先减压、后释放，不支持把‘损’字直接等同于下跌。两套方法合看，本周正式方向定为上涨。",
    expectedPath:
      "整体偏上，但不是直线拉升。前段允许有震荡和洗盘，后段更容易体现财爻得生后的上行优势。",
    supportLevels: [],
    resistanceLevels: [],
    riskLevel: "极高",
    catalysts: ["申月生财", "伏藏子孙申金当令", "世兄弟丑土失势"],
    risks: ["高波动", "静卦节奏可能偏慢", "7×24市场瞬时反向"],
    consensusStars: 4,
    consensusLabel: "老师01六亲旺衰与老师02静卦秩序共同偏多",
    methodViews: [
      {
        id: "hype-w2-teacher01",
        label: "老师01·六亲旺衰",
        direction: "上涨",
        weight: 65,
        summary: "财子水在申月得生，伏子孙申金当令生财，世兄弟丑土克财能力下降。",
      },
      {
        id: "hype-w2-teacher02",
        label: "老师02·主卦与世应",
        direction: "震荡上涨",
        weight: 35,
        summary: "山泽损静卦以减压换取后续空间，静卦不支持过度追逐单日波动。",
      },
    ],
    ichingEvidence: {
      primaryHexagram: "山泽损",
      changingHexagram: null,
      notes:
        "静卦。妻财子水静现，世爻兄弟丑土；伏藏子孙申金位于世爻之下。原图起卦于2026-07-30，目标周进入申月后重新按目标月令复核。",
    },
    version: 3,
    status: "published",
    sourceType: "ICHING_RESEARCH",
    publishedAt: PUBLISHED_AT,
    lockedAt: PUBLISHED_AT,
    validationStatus: "UNVERIFIED",
  },
  {
    id: "HYPE-W3-20260817-V3",
    assetId: "hype",
    forecastType: "WEEK_3",
    periodStart: "2026-08-17",
    periodEnd: "2026-08-23",
    direction: "下跌",
    upProbability: 22,
    sidewaysProbability: 28,
    downProbability: 50,
    summary:
      "老师01最看重妻财卯木发动后化兄弟酉金：财转兄弟且在申月受金克，属于资金优势转为抛压/竞争的明显弱信号。官鬼巳火动化子孙亥水、父母未土动化子孙子水说明后段会有风险释放和修复，但不足以推翻主财爻转弱。老师02看风地观化地雷复六合，倾向先经历明显回撤，再出现回补。",
    expectedPath: "前段承压更明显，后段允许反弹修复；整周最终方向仍按下跌处理。",
    supportLevels: [],
    resistanceLevels: [],
    riskLevel: "极高",
    catalysts: ["风险释放后的修复"],
    risks: ["财化兄弟", "申月金旺克财", "高波动反抽"],
    consensusStars: 4,
    consensusLabel: "财化兄弟是主导信号，复卦只保留后段修复路径",
    methodViews: [
      {
        id: "hype-w3-teacher01",
        label: "老师01·财爻与动变",
        direction: "下跌",
        weight: 70,
        summary: "妻财卯木动化兄弟酉金，且目标申月金旺，主财爻明显转弱。",
      },
      {
        id: "hype-w3-teacher02",
        label: "老师02·观→复",
        direction: "先跌后涨",
        weight: 30,
        summary: "观卦先观察、复卦后回返，保留后段修复但不改整周偏弱。",
      },
    ],
    ichingEvidence: {
      primaryHexagram: "风地观",
      changingHexagram: "地雷复",
      notes: "妻财卯木发动化兄弟酉金；官鬼巳火动化子孙亥水；父母未土应爻发动化子孙子水。变卦六合。",
    },
    version: 3,
    status: "published",
    sourceType: "ICHING_RESEARCH",
    publishedAt: PUBLISHED_AT,
    lockedAt: PUBLISHED_AT,
    validationStatus: "UNVERIFIED",
  },
  {
    id: "HYPE-W4-20260823-V3",
    assetId: "hype",
    forecastType: "WEEK_4",
    periodStart: "2026-08-23",
    periodEnd: "2026-08-31",
    direction: "上涨",
    upProbability: 60,
    sidewaysProbability: 24,
    downProbability: 16,
    summary:
      "老师01看到子孙未土发动化妻财申金，同时原局另有妻财酉金，目标申月财金得令；世爻兄弟巳火在申月失势，克财能力弱。老师02看离为火六冲化天火同人归魂，认为周内仍会剧烈摇摆，但最终更偏向资金重新汇聚。",
    expectedPath: "高波动中偏上，容易出现急涨急洗，但后程仍更偏向上行。",
    supportLevels: [],
    resistanceLevels: [],
    riskLevel: "极高",
    catalysts: ["子孙化财", "申酉财金得令"],
    risks: ["主卦六冲", "归魂反复", "高杠杆清算"],
    consensusStars: 5,
    consensusLabel: "子孙化财与申月财旺形成强多头共振",
    methodViews: [
      {
        id: "hype-w4-teacher01",
        label: "老师01·六亲旺衰",
        direction: "上涨",
        weight: 70,
        summary: "子孙未土动化妻财申金，申月财星当令；世兄弟巳火失势。",
      },
      {
        id: "hype-w4-teacher02",
        label: "老师02·离→同人",
        direction: "震荡上涨",
        weight: 30,
        summary: "六冲负责放大振幅，同人归魂提示资金重新聚合但过程反复。",
      },
    ],
    ichingEvidence: {
      primaryHexagram: "离为火",
      changingHexagram: "天火同人",
      notes: "白虎子孙未土发动化妻财申金；原局另见妻财酉金；世爻兄弟巳火。主卦六冲，变卦归魂。",
    },
    version: 3,
    status: "published",
    sourceType: "ICHING_RESEARCH",
    publishedAt: PUBLISHED_AT,
    lockedAt: PUBLISHED_AT,
    validationStatus: "UNVERIFIED",
  },
  {
    id: "HYPE-Y1-20260731-V3",
    assetId: "hype",
    forecastType: "YEAR_1",
    periodStart: "2026-07-31",
    periodEnd: "2027-07-31",
    direction: "震荡上涨",
    upProbability: 43,
    sidewaysProbability: 31,
    downProbability: 26,
    summary:
      "一年主结构仍按风山渐化火山旅理解：长期有逐步抬升条件，但旅卦意味着资金和叙事迁移频繁，不能按平滑趋势持有。8月9日新增独立9—12月月卦后，秋季中段明显偏弱，12月才出现新的偏多窗口。",
    expectedPath: "8月高波动；9—11月整体偏弱；12月出现新的修复窗口；进入2027后再观察谦化升的渐进抬升。",
    supportLevels: [],
    resistanceLevels: [],
    riskLevel: "极高",
    catalysts: ["生态增长", "流动性改善", "2027谦→升"],
    risks: ["9—11月连续弱月", "旅卦流动性迁移", "极高波动"],
    archiveSummary: "未来一年：总体仍有抬升空间，但秋季先弱、12月再修复，路径非常不平滑。",
    calendarMonthPath: [
      {
        period: "2026-09",
        labelZh: "2026年9月",
        direction: "下跌",
        primaryHexagram: "火地晋",
        changingHexagram: null,
        summary: "酉月妻财卯木月破，世爻兄弟酉金当令，兄弟旺而克财，月度方向明确偏空。",
        sourceNote: "2026-08-09独立9月卦",
        riskNote: "晋为卦名不直接等于上涨；六亲旺衰明显偏弱。",
      },
      {
        period: "2026-10",
        labelZh: "2026年10月",
        direction: "震荡下跌",
        primaryHexagram: "乾为天",
        changingHexagram: "火雷噬嗑",
        summary: "乾六冲放大振幅，兄弟申金发动而财寅木也动，资金与抛压直接对冲；按六亲强弱仍略偏空。",
        sourceNote: "2026-08-09独立10月卦",
        riskNote: "多爻同动，方向确定性低于9月和11月。",
      },
      {
        period: "2026-11",
        labelZh: "2026年11月",
        direction: "下跌",
        primaryHexagram: "水火既济",
        changingHexagram: "泽山咸",
        summary: "妻财午火伏于世爻兄弟亥水之下，亥月兄弟得令而财火弱，资金面受压。",
        sourceNote: "2026-08-09独立11月卦",
        riskNote: "财伏且世兄弟旺，是本组月卦中较明确的偏空结构。",
      },
      {
        period: "2026-12",
        labelZh: "2026年12月",
        direction: "震荡上涨",
        primaryHexagram: "火雷噬嗑",
        changingHexagram: "雷天大壮",
        summary: "两处妻财出现，子孙巳火发动化妻财戌土，重新出现生财/化财结构；但兄弟寅木也发动且变卦六冲，因此只定为高波动偏多。",
        sourceNote: "2026-08-09独立12月卦",
        riskNote: "六冲会放大涨跌，不按单边上涨处理。",
      },
    ],
    ichingEvidence: {
      primaryHexagram: "风山渐",
      changingHexagram: "火山旅",
      notes: "原一年卦保留；8月9日新增9—12月独立月卦作为分段路线，不覆盖原一年卦。",
    },
    version: 3,
    status: "published",
    sourceType: "ICHING_RESEARCH",
    publishedAt: PUBLISHED_AT,
    lockedAt: PUBLISHED_AT,
    validationStatus: "UNVERIFIED",
  },
  {
    id: "HYPE-2027-20260809-V1",
    assetId: "hype",
    forecastType: "YEAR_3",
    periodStart: "2027-01-01",
    periodEnd: "2027-12-31",
    direction: "震荡上涨",
    upProbability: 46,
    sidewaysProbability: 34,
    downProbability: 20,
    summary:
      "2027独立年卦为地山谦化地风升。财卯木伏藏，说明上涨并非一开始就外显；官鬼午火发动化子孙亥水，风险力量后程转为释放，配合升卦更像逐步抬高。",
    expectedPath: "前段偏蓄势，中后段逐渐抬升，仍以阶梯式上涨而非直线行情理解。",
    supportLevels: [],
    resistanceLevels: [],
    riskLevel: "极高",
    catalysts: ["官鬼化子孙", "升卦渐进"],
    risks: ["财爻伏藏", "高波动资产长期不确定性"],
    archiveSummary: "2027：先藏后升，偏向阶梯式抬升。",
    ichingEvidence: {
      primaryHexagram: "地山谦",
      changingHexagram: "地风升",
      notes: "妻财卯木伏于官鬼午火之下；官鬼午火发动化子孙亥水。",
    },
    version: 1,
    status: "published",
    sourceType: "ICHING_RESEARCH",
    publishedAt: PUBLISHED_AT,
    lockedAt: PUBLISHED_AT,
    validationStatus: "UNVERIFIED",
  },
];

export const SOL_PERIOD_FORECASTS_20260809: ConvictionPeriodForecast[] = [
  {
    id: "SOL-W1-20260809-V1",
    assetId: "sol",
    forecastType: "WEEK",
    periodStart: "2026-08-09",
    periodEnd: "2026-08-16",
    direction: "冲高回落",
    upProbability: 33,
    sidewaysProbability: 27,
    downProbability: 40,
    summary:
      "老师01看见子孙巳火发动化妻财未土，前段有推升力量；但妻财未土随后发动化官鬼酉金，而申月官鬼酉金旺，说明资金优势容易转成风险压力。老师02看巽为风六冲化火风鼎，顺势之后进入重整，周内更像先强后弱。",
    expectedPath: "前段有上冲机会，随后波动放大并回落；整周最终方向按冲高回落处理。",
    supportLevels: [],
    resistanceLevels: [],
    riskLevel: "极高",
    catalysts: ["子孙化财", "高Beta风险偏好"],
    risks: ["财化官鬼", "申月官鬼酉金旺", "主卦六冲"],
    consensusStars: 4,
    consensusLabel: "前段生财、后段财化鬼，周内先强后弱较清晰",
    methodViews: [
      {
        id: "sol-w1-teacher01",
        label: "老师01·财爻动变",
        direction: "冲高回落",
        weight: 70,
        summary: "子孙巳火先化财未土，但财未土再化官鬼酉金，后段风险强于前段。",
      },
      {
        id: "sol-w1-teacher02",
        label: "老师02·巽→鼎",
        direction: "先涨后跌",
        weight: 30,
        summary: "巽六冲强调快速变化，鼎卦对应重整，适合解释先顺势后重构。",
      },
    ],
    ichingEvidence: {
      primaryHexagram: "巽为风",
      changingHexagram: "火风鼎",
      notes: "子孙巳火发动化妻财未土；妻财未土发动化官鬼酉金；世爻兄弟卯木。主卦六冲。",
    },
    version: 1,
    status: "published",
    sourceType: "ICHING_RESEARCH",
    publishedAt: PUBLISHED_AT,
    lockedAt: PUBLISHED_AT,
    validationStatus: "UNVERIFIED",
  },
  {
    id: "SOL-W2-20260817-V1",
    assetId: "sol",
    forecastType: "WEEK_2",
    periodStart: "2026-08-17",
    periodEnd: "2026-08-23",
    direction: "先跌后涨",
    upProbability: 44,
    sidewaysProbability: 25,
    downProbability: 31,
    summary:
      "妻财未土发动化兄弟寅木，前段资金受压；但世爻父母亥水发动化妻财戌土，官鬼酉金又化父母子水，说明后段风险释放后重新出现财星承接。老师02的大过化蛊也更像先处理过度、再修复结构。",
    expectedPath: "先回撤消化，后半段逐步修复；如果前段跌得快，后段反弹弹性会更大。",
    supportLevels: [],
    resistanceLevels: [],
    riskLevel: "极高",
    catalysts: ["世爻化财", "官鬼转父母"],
    risks: ["财化兄弟", "大过游魂"],
    consensusStars: 3,
    consensusLabel: "前压后修复，方向强度低于8/24–30",
    methodViews: [
      {
        id: "sol-w2-teacher01",
        label: "老师01·动爻先后",
        direction: "先跌后涨",
        weight: 65,
        summary: "财先化兄弟承压，世爻后化财并伴随官鬼泄出，形成先弱后修复。",
      },
      {
        id: "sol-w2-teacher02",
        label: "老师02·大过→蛊",
        direction: "先跌后涨",
        weight: 35,
        summary: "过盛先纠偏，蛊卦再整治，路径更像先修正再恢复。",
      },
    ],
    ichingEvidence: {
      primaryHexagram: "泽风大过",
      changingHexagram: "山风蛊",
      notes: "妻财未土动化兄弟寅木；官鬼酉金动化父母子水；父母亥水世爻动化妻财戌土。主卦游魂，变卦归魂。",
    },
    version: 1,
    status: "published",
    sourceType: "ICHING_RESEARCH",
    publishedAt: PUBLISHED_AT,
    lockedAt: PUBLISHED_AT,
    validationStatus: "UNVERIFIED",
  },
  {
    id: "SOL-W3-20260824-V1",
    assetId: "sol",
    forecastType: "WEEK_3",
    periodStart: "2026-08-24",
    periodEnd: "2026-08-30",
    direction: "上涨",
    upProbability: 55,
    sidewaysProbability: 28,
    downProbability: 17,
    summary:
      "目标仍在申月，妻财子水得月令金生；世爻官鬼寅木被申月冲，风险力量受制。老师02看山天大畜化风雷益，也支持先蓄势、后增益。虽然财爻有一处动化父母，仍不足以盖过财水得生与官鬼受冲。",
    expectedPath: "先蓄势、后上行，后半周更容易体现强势。",
    supportLevels: [],
    resistanceLevels: [],
    riskLevel: "极高",
    catalysts: ["申月生财", "官鬼寅木受冲", "大畜→益"],
    risks: ["高波动", "财动化父母带来阶段性兑现"],
    consensusStars: 4,
    consensusLabel: "财旺、鬼弱与大畜化益形成偏多共振",
    methodViews: [
      {
        id: "sol-w3-teacher01",
        label: "老师01·财鬼旺衰",
        direction: "上涨",
        weight: 65,
        summary: "财子水得申月生扶，世官鬼寅木逢申冲，风险受制。",
      },
      {
        id: "sol-w3-teacher02",
        label: "老师02·大畜→益",
        direction: "上涨",
        weight: 35,
        summary: "大畜先积蓄，益卦后增益，结构偏向蓄势后的上行释放。",
      },
    ],
    ichingEvidence: {
      primaryHexagram: "山天大畜",
      changingHexagram: "风雷益",
      notes: "妻财子水应爻发动；世爻官鬼寅木发动。目标申月对财水有生扶，对寅木官鬼形成冲制。",
    },
    version: 1,
    status: "published",
    sourceType: "ICHING_RESEARCH",
    publishedAt: PUBLISHED_AT,
    lockedAt: PUBLISHED_AT,
    validationStatus: "UNVERIFIED",
  },
  {
    id: "SOL-M1-20260809-V1",
    assetId: "sol",
    forecastType: "MONTH_1",
    periodStart: "2026-08-01",
    periodEnd: "2026-08-31",
    direction: "上涨",
    upProbability: 54,
    sidewaysProbability: 28,
    downProbability: 18,
    summary:
      "8月卦天泽履化天雷无妄六冲。世爻子孙申金在申月当令，伏藏妻财子水得子孙生扶；应爻官鬼卯木发动化寅木，且木受申月克制，风险端相对退弱。老师01和老师02都更偏向8月整体向上，但六冲意味着过程不会平滑。",
    expectedPath: "8月整体偏上，中间穿插大幅回撤；8/17–23更容易先调整，8/24–30再出现较好修复。",
    supportLevels: [],
    resistanceLevels: [],
    riskLevel: "极高",
    catalysts: ["子孙申金持世当令", "伏财子水得生", "官鬼木受申克"],
    risks: ["变卦六冲", "高Beta行情"],
    consensusStars: 4,
    consensusLabel: "8月月卦偏多，但周内节奏分化明显",
    methodViews: [
      {
        id: "sol-m1-teacher01",
        label: "老师01·世财鬼旺衰",
        direction: "上涨",
        weight: 70,
        summary: "子孙申金持世当令并生伏财子水，官鬼卯木受申月克制。",
      },
      {
        id: "sol-m1-teacher02",
        label: "老师02·履→无妄",
        direction: "震荡上涨",
        weight: 30,
        summary: "履卦强调谨慎推进，无妄六冲放大震荡，但不改变月度偏多。",
      },
    ],
    ichingEvidence: {
      primaryHexagram: "天泽履",
      changingHexagram: "天雷无妄",
      notes: "世爻子孙申金；妻财子水伏藏；应爻官鬼卯木发动化官鬼寅木。变卦六冲。",
    },
    version: 1,
    status: "published",
    sourceType: "ICHING_RESEARCH",
    publishedAt: PUBLISHED_AT,
    lockedAt: PUBLISHED_AT,
    validationStatus: "UNVERIFIED",
  },
  {
    id: "SOL-AUTUMN-20260901-V1",
    assetId: "sol",
    forecastType: "MONTH_3",
    periodStart: "2026-09-01",
    periodEnd: "2026-12-31",
    direction: "下跌",
    upProbability: 20,
    sidewaysProbability: 28,
    downProbability: 52,
    summary:
      "9—12月四个独立月卦显示：9月兄弟酉金当令克财最明确；10月蛊化艮六冲，修复受阻且容易停滞；11月财未土持世发动化父母子水，财势继续泄；12月财卯木发动化兄弟申金，再次出现财转兄弟。四个月合看，秋冬主方向偏下。",
    expectedPath: "9月先弱，10月反复整理，11月再承压，12月仍以高波动偏弱为主。",
    supportLevels: [],
    resistanceLevels: [],
    riskLevel: "极高",
    catalysts: ["局部月度修复"],
    risks: ["9月兄弟旺克财", "11月财化父母", "12月财化兄弟", "六冲反复"],
    archiveSummary: "2026年9—12月：整体偏弱，10月只是中途整理，不构成趋势反转。",
    calendarMonthPath: [
      {
        period: "2026-09",
        labelZh: "2026年9月",
        direction: "下跌",
        primaryHexagram: "火天大有",
        changingHexagram: "风天小畜",
        summary: "酉月兄弟酉金发动且当令，妻财寅木受金克；大有不能仅凭卦名判涨，月度方向偏空。",
        sourceNote: "2026-08-09独立9月卦",
        riskNote: "兄弟当令克财是核心。",
      },
      {
        period: "2026-10",
        labelZh: "2026年10月",
        direction: "震荡下跌",
        primaryHexagram: "山风蛊",
        changingHexagram: "艮为山",
        summary: "财丑土静守，但官鬼酉金持世，父母亥水发动；蛊化艮六冲更像修复过程被反复打断。",
        sourceNote: "2026-08-09独立10月卦",
        riskNote: "方向确定性弱于9月和11月。",
      },
      {
        period: "2026-11",
        labelZh: "2026年11月",
        direction: "下跌",
        primaryHexagram: "雷地豫",
        changingHexagram: "震为雷",
        summary: "妻财未土持世发动化父母子水，亥月土财失势，主卦六合转变卦六冲，稳定结构被打破。",
        sourceNote: "2026-08-09独立11月卦",
        riskNote: "财世泄出且由六合转六冲。",
      },
      {
        period: "2026-12",
        labelZh: "2026年12月",
        direction: "下跌",
        primaryHexagram: "泽地萃",
        changingHexagram: "雷山小过",
        summary: "妻财卯木发动化兄弟申金，兄弟酉金应爻也发动，资金端再次转向竞争/兑现，月度偏空。",
        sourceNote: "2026-08-09独立12月卦",
        riskNote: "小过游魂容易出现急促反弹，但不改主方向。",
      },
    ],
    ichingEvidence: {
      primaryHexagram: "天水讼",
      changingHexagram: "天泽履",
      notes: "跨期大卦为天水讼化天泽履；9—12月正式方向以四个独立月卦分段为主，跨期大卦只作背景。",
    },
    version: 1,
    status: "published",
    sourceType: "ICHING_RESEARCH",
    publishedAt: PUBLISHED_AT,
    lockedAt: PUBLISHED_AT,
    validationStatus: "UNVERIFIED",
  },
  {
    id: "SOL-Y2027-20260809-V1",
    assetId: "sol",
    forecastType: "YEAR_1",
    periodStart: "2027-01-01",
    periodEnd: "2027-12-31",
    direction: "震荡下跌",
    upProbability: 25,
    sidewaysProbability: 33,
    downProbability: 42,
    summary:
      "2027独立年卦泽火革化泽山咸。妻财午火伏于世爻兄弟亥水之下，世兄弟对财形成持续压制；子孙卯木应爻发动后化官鬼辰土，风险端反而增强。",
    expectedPath: "全年有多次结构变化和反弹，但主方向偏弱，不按单边牛市理解。",
    supportLevels: [],
    resistanceLevels: [],
    riskLevel: "极高",
    catalysts: ["革卦结构切换"],
    risks: ["财伏兄弟下", "子孙化官鬼", "高波动"],
    archiveSummary: "2027：多次结构切换，但主方向偏弱。",
    ichingEvidence: {
      primaryHexagram: "泽火革",
      changingHexagram: "泽山咸",
      notes: "妻财午火伏于世爻兄弟亥水；子孙卯木应爻发动化官鬼辰土。",
    },
    version: 1,
    status: "published",
    sourceType: "ICHING_RESEARCH",
    publishedAt: PUBLISHED_AT,
    lockedAt: PUBLISHED_AT,
    validationStatus: "UNVERIFIED",
  },
  {
    id: "SOL-Y2028-20260809-V1",
    assetId: "sol",
    forecastType: "YEAR_3",
    periodStart: "2028-01-01",
    periodEnd: "2028-12-31",
    direction: "震荡上涨",
    upProbability: 45,
    sidewaysProbability: 35,
    downProbability: 20,
    summary:
      "2028为山天大畜静卦。两处妻财子水明现，世爻官鬼寅木虽然代表约束，但静卦更像长期积蓄，财星并未被兄弟直接压住。",
    expectedPath: "以蓄势和阶梯式抬升为主，速度不快，但结构好于2027。",
    supportLevels: [],
    resistanceLevels: [],
    riskLevel: "极高",
    catalysts: ["双财子水", "大畜蓄势"],
    risks: ["静卦节奏慢", "官鬼持世"],
    archiveSummary: "2028：蓄势偏多，结构好于2027。",
    ichingEvidence: {
      primaryHexagram: "山天大畜",
      changingHexagram: null,
      notes: "静卦。妻财子水两现；世爻官鬼寅木。",
    },
    version: 1,
    status: "published",
    sourceType: "ICHING_RESEARCH",
    publishedAt: PUBLISHED_AT,
    lockedAt: PUBLISHED_AT,
    validationStatus: "UNVERIFIED",
  },
  {
    id: "SOL-Y10-20260809-V1",
    assetId: "sol",
    forecastType: "YEAR_10",
    periodStart: "2026-08-09",
    periodEnd: "2036-08-09",
    direction: "震荡",
    upProbability: 31,
    sidewaysProbability: 38,
    downProbability: 31,
    summary:
      "十年卦水雷屯化泽火革，财午火伏藏，官鬼两动并化兄弟，说明长期会经历多轮制度、技术和流动性重构。这个卦不支持把SOL简单定义为十年单边复利资产。",
    expectedPath: "长期多轮牛熊与结构切换并存，存续和生态价值需要持续验证。",
    supportLevels: [],
    resistanceLevels: [],
    riskLevel: "极高",
    catalysts: ["生态扩张", "协议与应用创新"],
    risks: ["官鬼化兄弟", "周期重构", "技术替代", "监管和流动性"],
    archiveSummary: "10年：大周期重构反复，方向不明确，不能按稳定复利资产处理。",
    ichingEvidence: {
      primaryHexagram: "水雷屯",
      changingHexagram: "泽火革",
      notes: "妻财午火伏藏；官鬼辰土等动爻后转兄弟；世爻子孙寅木。",
    },
    version: 1,
    status: "published",
    sourceType: "ICHING_RESEARCH",
    publishedAt: PUBLISHED_AT,
    lockedAt: PUBLISHED_AT,
    validationStatus: "UNVERIFIED",
  },
];



const TEACHER_REVIEW_AT = "2026-08-09T21:54:00+08:00";

function requireHypeOriginal(id: string): ConvictionPeriodForecast {
  const hit = HYPE_UPDATE_FORECASTS_20260809.find((item) => item.id === id);
  if (!hit) throw new Error(`Missing HYPE teacher-review baseline: ${id}`);
  return hit;
}

function requireSolOriginal(id: string): ConvictionPeriodForecast {
  const hit = SOL_PERIOD_FORECASTS_20260809.find((item) => item.id === id);
  if (!hit) throw new Error(`Missing SOL teacher-review baseline: ${id}`);
  return hit;
}

/**
 * V4 is a doctrine review, not a direction rewrite. Old V3 records remain in
 * the archive. The new version removes hexagram-name voting and makes the
 * teacher's financial Liu Yao hierarchy explicit.
 */
export const HYPE_TEACHER_REVIEW_FORECASTS_20260809: ConvictionPeriodForecast[] = [
  {
    ...requireHypeOriginal("HYPE-W2-20260809-V3"),
    id: "HYPE-W2-20260809-V4",
    direction: "上涨",
    summary:
      "老师笔记复核版：金融卦不以‘损’这个卦名直接判跌。原图起卦为2026-07-30乙巳日、日空寅卯；目标周进入丙申月后，妻财子水静现，伏藏子孙申金当令并可生财，世爻兄弟丑土虽有克财关系但不当令。按‘财爻第一、子孙第二、兄弟看克财’的老师法，本周正式方向继续看涨。",
    expectedPath:
      "方向看涨，但静卦与高波动资产特征都提示不会直线运行。周初允许震荡/洗盘，后段更容易体现申月子孙旺、生财后的上行优势。逐日若无独立日卦，只按周卦时序拆分。",
    consensusLabel: "老师法复核：申月子孙申金当令生财，兄弟丑土不当令；卦名只作背景",
    methodViews: [
      {
        id: "hype-w2-teacher-method-v4",
        label: "老师法·六亲旺衰",
        direction: "上涨",
        weight: 100,
        summary: "妻财子水得申金生扶，伏藏子孙申金当令；世兄弟丑土不当令，克财优势不足。",
      },
      {
        id: "hype-w2-hexagram-context-v4",
        label: "卦体/时序辅助·不投方向",
        direction: "震荡",
        weight: 0,
        summary: "山泽损静卦只用于提醒节奏偏慢、先减压再释放；禁止用‘损’字反向改成看跌。",
      },
    ],
    ichingEvidence: {
      primaryHexagram: "山泽损",
      changingHexagram: null,
      notes:
        "静卦。原图：2026-07-30 19:54，丙午年乙未月乙巳日丙戌时，日空寅卯。妻财子水静现，世爻兄弟丑土，伏藏子孙申金。目标周进入丙申月后按目标月令重新复核。",
    },
    rollingUpdate: {
      asOf: TEACHER_REVIEW_AT,
      label: "老师原始笔记复核 · V4",
      summary: "V4不改V3看涨方向，只纠正方法表达：六亲旺衰负责方向，卦名只解释节奏；原V3完整保留。",
      originalLockedView: "HYPE-W2-20260809-V3 保留且不覆盖。",
      timingTolerance: "周内逐日若无独立日卦，只能作为周卦时序拆分，不能伪装成日卦。",
    },
    version: 4,
    publishedAt: TEACHER_REVIEW_AT,
    lockedAt: TEACHER_REVIEW_AT,
  },
  {
    ...requireHypeOriginal("HYPE-W3-20260817-V3"),
    id: "HYPE-W3-20260817-V4",
    direction: "下跌",
    summary:
      "老师笔记复核版：主导证据是妻财卯木发动化兄弟酉金，财转兄弟；目标仍在申月，金旺又克卯木财。官鬼巳火化子孙亥水、父母未土化子孙子水只说明后段可能风险释放并修复，不能盖过主财爻转弱。正式方向继续看跌。",
    expectedPath: "前段承压优先，后段允许出现明显反弹/修复；反弹属于下跌周里的路径，不把整周重新定义成上涨。",
    consensusLabel: "老师法复核：财卯动化兄弟酉，申月金旺克财；后段修复不推翻主方向",
    methodViews: [
      {
        id: "hype-w3-teacher-method-v4",
        label: "老师法·财爻动变",
        direction: "下跌",
        weight: 100,
        summary: "妻财卯木发动化兄弟酉金，且申月金旺克财，是本周最重要的弱信号。",
      },
      {
        id: "hype-w3-hexagram-context-v4",
        label: "卦体/时序辅助·不投方向",
        direction: "先跌后涨",
        weight: 0,
        summary: "观→复只用于描述先观察/回撤、后回返修复，不独立决定方向。",
      },
    ],
    rollingUpdate: {
      asOf: TEACHER_REVIEW_AT,
      label: "老师原始笔记复核 · V4",
      summary: "V4保留V3下跌方向，把财化兄弟作为唯一主方向证据；卦名解释降为0权重时序辅助。",
      originalLockedView: "HYPE-W3-20260817-V3 保留且不覆盖。",
      timingTolerance: "后段反弹属于路径，不是事后把整周方向改成上涨。",
    },
    version: 4,
    publishedAt: TEACHER_REVIEW_AT,
    lockedAt: TEACHER_REVIEW_AT,
  },
  {
    ...requireHypeOriginal("HYPE-W4-20260823-V3"),
    id: "HYPE-W4-20260823-V4",
    direction: "上涨",
    summary:
      "老师笔记复核版：子孙未土发动化妻财申金，原局另见妻财酉金；目标申月财金得令。世爻兄弟巳火在申月失势，克财能力下降。六冲/归魂只负责放大振幅与反复，不直接投看跌票，因此正式方向继续看涨。",
    expectedPath: "高波动偏上，容易急涨急洗。技术执行上只等承接和突破确认，不因单次回撤倒改周卦方向。",
    consensusLabel: "老师法复核：子孙化财 + 申月财金得令 + 世兄弟失势，三项同向偏多",
    methodViews: [
      {
        id: "hype-w4-teacher-method-v4",
        label: "老师法·六亲旺衰",
        direction: "上涨",
        weight: 100,
        summary: "子孙未土动化妻财申金，财申/酉在申月得势；世兄弟巳火失令。",
      },
      {
        id: "hype-w4-hexagram-context-v4",
        label: "卦体/时序辅助·不投方向",
        direction: "震荡",
        weight: 0,
        summary: "离六冲与同人归魂只提示急涨急洗和反复，不直接决定涨跌。",
      },
    ],
    rollingUpdate: {
      asOf: TEACHER_REVIEW_AT,
      label: "老师原始笔记复核 · V4",
      summary: "V4不改V3看涨，只把六冲/归魂从方向解释降为波动解释。",
      originalLockedView: "HYPE-W4-20260823-V3 保留且不覆盖。",
      timingTolerance: "高波动路径不能被误读为方向冲突。",
    },
    version: 4,
    publishedAt: TEACHER_REVIEW_AT,
    lockedAt: TEACHER_REVIEW_AT,
  },
];

/** SOL V2 keeps the Aug. 9 source charts but re-expresses them strictly under the teacher doctrine. */
export const SOL_TEACHER_REVIEW_FORECASTS_20260809: ConvictionPeriodForecast[] = [
  {
    ...requireSolOriginal("SOL-W1-20260809-V1"),
    id: "SOL-W1-20260809-V2",
    direction: "冲高回落",
    summary:
      "老师笔记复核版：原图起卦2026-08-09 16:29，丙午年丙申月乙卯日甲申时、日空子丑。子孙巳火发动化妻财未土，先有生财/化财推动；但妻财未土随后发动化官鬼酉金，而申月金旺，风险端后程增强。世爻兄弟卯木也不能忽略。正式路径仍为先强后弱/冲高回落。",
    expectedPath: "前段允许明显上冲，随后重点防财化官鬼后的风险放大和回落；本周结论与8月月卦偏多存在真实周期冲突，页面必须同时展示。",
    consensusLabel: "老师法复核：子孙先化财，财再化官鬼；周卦先强后弱，与月卦偏多存在真实冲突",
    methodViews: [
      {
        id: "sol-w1-teacher-method-v2",
        label: "老师法·财爻动变",
        direction: "冲高回落",
        weight: 100,
        summary: "子孙巳火先化财未土形成推动，但财未土再化官鬼酉金，后段风险压力增强。",
      },
      {
        id: "sol-w1-hexagram-context-v2",
        label: "卦体/时序辅助·不投方向",
        direction: "震荡",
        weight: 0,
        summary: "巽六冲→鼎只用于解释快速变化和重整，不用卦名替代六亲旺衰。",
      },
    ],
    ichingEvidence: {
      primaryHexagram: "巽为风（六冲）",
      changingHexagram: "火风鼎",
      notes:
        "原图：2026-08-09 16:29，丙午年丙申月乙卯日甲申时，日空子丑。世爻兄弟卯木；子孙巳火发动化妻财未土；妻财未土发动化官鬼酉金；应爻官鬼酉金。",
    },
    rollingUpdate: {
      asOf: TEACHER_REVIEW_AT,
      label: "老师原始笔记复核 · V2",
      summary: "V2保留V1冲高回落，不再用‘巽→鼎’卦名投方向；周/月冲突必须公开保留。",
      originalLockedView: "SOL-W1-20260809-V1 保留且不覆盖。",
      timingTolerance: "前段上涨不等于周卦命中上涨，必须按完整周路径验证。",
    },
    version: 2,
    publishedAt: TEACHER_REVIEW_AT,
    lockedAt: TEACHER_REVIEW_AT,
  },
  {
    ...requireSolOriginal("SOL-W2-20260817-V1"),
    id: "SOL-W2-20260817-V2",
    direction: "先跌后涨",
    summary:
      "老师笔记复核版：妻财未土发动化兄弟寅木，先出现财转兄弟的承压；世爻父母亥水发动化妻财戌土，官鬼酉金化父母子水，后段又重新出现财星承接与风险释放。因此路径继续定义为先跌后涨，卦名不参与方向投票。",
    consensusLabel: "老师法复核：财先化兄弟承压，世爻后化财并伴随官鬼泄出，先弱后修复",
    methodViews: [
      { id: "sol-w2-teacher-method-v2", label: "老师法·动爻先后", direction: "先跌后涨", weight: 100, summary: "财先化兄弟，世爻后化财，构成先压后修复。" },
      { id: "sol-w2-hexagram-context-v2", label: "卦体/时序辅助·不投方向", direction: "震荡", weight: 0, summary: "大过→蛊只作为结构重整背景。" },
    ],
    rollingUpdate: { asOf: TEACHER_REVIEW_AT, label: "老师原始笔记复核 · V2", summary: "V2不改V1路径，只纠正方法表达。", originalLockedView: "SOL-W2-20260817-V1 保留且不覆盖。", timingTolerance: "先跌后涨按完整周期验证。" },
    version: 2,
    publishedAt: TEACHER_REVIEW_AT,
    lockedAt: TEACHER_REVIEW_AT,
  },
  {
    ...requireSolOriginal("SOL-W3-20260824-V1"),
    id: "SOL-W3-20260824-V2",
    direction: "上涨",
    summary:
      "老师笔记复核版：目标仍在申月，妻财子水得申金生扶；世爻官鬼寅木逢申冲，风险力量受制。虽然财爻存在动化父母的兑现信号，但不足以盖过财得生、鬼受冲的主结构，因此正式方向继续看涨。",
    consensusLabel: "老师法复核：申月生财 + 官鬼寅木受冲，主结构偏多；卦名仅辅助",
    methodViews: [
      { id: "sol-w3-teacher-method-v2", label: "老师法·财鬼旺衰", direction: "上涨", weight: 100, summary: "财子水得申月生扶，世官鬼寅木受申冲，风险端受制。" },
      { id: "sol-w3-hexagram-context-v2", label: "卦体/时序辅助·不投方向", direction: "震荡", weight: 0, summary: "大畜→益只作蓄势/释放背景，不直接投涨跌票。" },
    ],
    rollingUpdate: { asOf: TEACHER_REVIEW_AT, label: "老师原始笔记复核 · V2", summary: "V2保留V1看涨，移除卦名方向权重。", originalLockedView: "SOL-W3-20260824-V1 保留且不覆盖。", timingTolerance: "高波动不等于方向翻转。" },
    version: 2,
    publishedAt: TEACHER_REVIEW_AT,
    lockedAt: TEACHER_REVIEW_AT,
  },
  {
    ...requireSolOriginal("SOL-M1-20260809-V1"),
    id: "SOL-M1-20260809-V2",
    direction: "上涨",
    summary:
      "老师笔记复核版：8月月卦中世爻子孙申金在申月当令，伏藏妻财子水得子孙生扶；应爻官鬼卯木发动化寅木，木在申月受克，风险端相对退弱。月度正式方向继续看涨；六冲只说明过程不平滑。它与8/9–16周卦先强后弱存在真实时间尺度冲突，不能互相覆盖。",
    consensusLabel: "老师法复核：子孙申金持世当令生伏财，官鬼木受申克；月度偏多但与本周节奏冲突",
    methodViews: [
      { id: "sol-m1-teacher-method-v2", label: "老师法·世财鬼旺衰", direction: "上涨", weight: 100, summary: "子孙申金持世当令并生伏财子水，官鬼卯/寅木受申月克制。" },
      { id: "sol-m1-hexagram-context-v2", label: "卦体/时序辅助·不投方向", direction: "震荡", weight: 0, summary: "履→无妄六冲只负责提示谨慎推进与大波动。" },
    ],
    rollingUpdate: { asOf: TEACHER_REVIEW_AT, label: "老师原始笔记复核 · V2", summary: "V2保留月度看涨，并明确周/月真实冲突。", originalLockedView: "SOL-M1-20260809-V1 保留且不覆盖。", timingTolerance: "短周期先强后弱与月度偏多可以同时成立。" },
    version: 2,
    publishedAt: TEACHER_REVIEW_AT,
    lockedAt: TEACHER_REVIEW_AT,
  },
];



const DUAL_TEACHER_FINAL_AT = "2026-08-10T05:40:00+08:00";

/**
 * V7.16.6 is the final two-teacher publication pass requested by the owner.
 * It NEVER overwrites old calls. Higher-version records become the member UI's
 * current publication while all V1-V4 records remain auditable.
 *
 * Teacher 01: financial Liu Yao hierarchy (财爻 > 子孙 > 兄弟/官鬼/父母, then
 * month/day strength, void/break/tomb, world/response and moving transformations).
 * Teacher 02: primary hexagram -> moving lines -> changed hexagram -> special-hexagram
 * filter -> TARGET month order -> multi-cycle inheritance. Hexagram names alone are
 * forbidden from deciding direction.
 */
export const HYPE_DUAL_TEACHER_FINAL_20260810: ConvictionPeriodForecast[] = [
  {
    id: "HYPE-W2-20260809-V6", assetId: "hype", forecastType: "WEEK_2",
    periodStart: "2026-08-09", periodEnd: "2026-08-16", direction: "震荡下跌",
    upProbability: 27, sidewaysProbability: 43, downProbability: 30,
    summary: "双导师最终版：老师01看妻财子水明现、伏藏子孙申金在申月得势，说明下方并非没有承接；但兄弟丑土持世、静卦缺少强推动，财虽得生却难形成干净主升。老师02按山泽损静卦与目标申月复核，损不等于单边下跌，更接近先减压、先消化，再逐步企稳。综合定性为震荡偏弱，而不是旧版的直接看涨。",
    expectedPath: "前段承压/回踩 → 中段反复消化 → 后段逐步企稳；若出现反弹，先按弱周中的修复理解。",
    supportLevels: [], resistanceLevels: [], riskLevel: "极高",
    catalysts: ["申月子孙申金得势并可生财", "后段承接修复"],
    risks: ["兄弟持世", "静卦推动不足", "7×24高波动"],
    consensusStars: 3, consensusLabel: "两位老师都不支持追涨：有承接，但主结构更像先损后稳",
    methodViews: [
      { id: "hype-w2-t01-v6", label: "老师01·六亲旺衰/财爻优先", direction: "震荡下跌", weight: 65, summary: "财子水得申金生扶，但兄弟丑土持世且静卦无强动爻，承接存在而推动不足。" },
      { id: "hype-w2-t02-v6", label: "老师02·主卦→特殊卦→目标月令", direction: "震荡下跌", weight: 35, summary: "山泽损静卦在该周期更适合解释减压和消化，不把‘损’字机械翻译成暴跌。" },
    ],
    archiveSummary: "8/9–16：震荡偏弱，先压后稳。",
    ichingEvidence: { primaryHexagram: "山泽损", changingHexagram: null, notes: "原始周卦图：静卦；妻财子水、世爻兄弟丑土、伏藏子孙申金。起卦2026-07-30，目标周期进入申月后按目标月令复核。" },
    rollingUpdate: { asOf: DUAL_TEACHER_FINAL_AT, label: "双导师最终复核 · V6", summary: "旧V3/V4均保留；V6按两套老师方法重新综合，正式从‘看涨’修订为‘震荡偏弱、先压后稳’。", originalLockedView: "旧版本保留用于审计，不回写。", timingTolerance: "无独立日卦时只做周内路径拆分，不伪造日卦。" },
    version: 6, status: "published", sourceType: "ICHING_RESEARCH", publishedAt: DUAL_TEACHER_FINAL_AT, lockedAt: DUAL_TEACHER_FINAL_AT, validationStatus: "UNVERIFIED",
  },
  {
    id: "HYPE-W3-20260817-V6", assetId: "hype", forecastType: "WEEK_3",
    periodStart: "2026-08-17", periodEnd: "2026-08-23", direction: "先跌后涨",
    upProbability: 37, sidewaysProbability: 25, downProbability: 38,
    summary: "老师01的主证据是妻财卯木发动化兄弟酉金，财转兄弟且申月金旺克财，前段压力明确；但官鬼巳火化子孙亥水、父母未土化子孙子水，风险后段存在释放。老师02按风地观化地雷复六合，路径天然偏向先退、后回返。两套方法合并后，不再只写整周下跌，而是锁定‘先跌后修复’。",
    expectedPath: "前半周下杀/洗盘概率更高 → 中后段风险释放 → 后半周出现较明显修复反弹。",
    supportLevels: [], resistanceLevels: [], riskLevel: "极高",
    catalysts: ["官鬼化子孙后的风险释放", "复卦回返"], risks: ["财化兄弟", "申月金旺克财", "急跌急弹"],
    consensusStars: 4, consensusLabel: "财化兄弟锁定前弱，复卦与风险释放锁定后修复",
    methodViews: [
      { id: "hype-w3-t01-v6", label: "老师01·财爻动变", direction: "先跌后涨", weight: 65, summary: "妻财卯木化兄弟酉金先压价格；官鬼、父母后续化子孙，为后段修复留出条件。" },
      { id: "hype-w3-t02-v6", label: "老师02·观→复/动爻时序", direction: "先跌后涨", weight: 35, summary: "观先退守观察，复再回返；六合更强调后段重新聚合。" },
    ],
    archiveSummary: "8/17–23：先跌/洗盘，后半段明显修复。",
    ichingEvidence: { primaryHexagram: "风地观", changingHexagram: "地雷复（六合）", notes: "妻财卯木动化兄弟酉金；官鬼巳火动化子孙亥水；父母未土动化子孙子水。" },
    version: 6, status: "published", sourceType: "ICHING_RESEARCH", publishedAt: DUAL_TEACHER_FINAL_AT, lockedAt: DUAL_TEACHER_FINAL_AT, validationStatus: "UNVERIFIED",
  },
  {
    id: "HYPE-W4-20260823-V6", assetId: "hype", forecastType: "WEEK_4",
    periodStart: "2026-08-23", periodEnd: "2026-08-31", direction: "上涨",
    upProbability: 59, sidewaysProbability: 25, downProbability: 16,
    summary: "老师01看到子孙未土发动化妻财申金，原局另见妻财酉金，目标申月财金得势；世爻兄弟巳火失势，克财能力下降。老师02看离为火六冲化天火同人归魂，六冲只放大振幅，同人强调资金重新汇聚。两位老师在方向上均偏多，这是HYPE八月三段周卦里最强的一段。",
    expectedPath: "高波动突破 → 加速上行 → 冲高后分歧；急洗不自动等于方向反转。",
    supportLevels: [], resistanceLevels: [], riskLevel: "极高",
    catalysts: ["子孙化财", "申/酉财金得势", "兄弟巳火失势"], risks: ["六冲放大波动", "归魂反复", "高位获利兑现"],
    consensusStars: 5, consensusLabel: "两位老师强共振：子孙化财 + 财金得势 + 同人聚合",
    methodViews: [
      { id: "hype-w4-t01-v6", label: "老师01·六亲旺衰", direction: "上涨", weight: 65, summary: "子孙未土动化妻财申金，申月得势；世兄弟巳火失令。" },
      { id: "hype-w4-t02-v6", label: "老师02·离六冲→同人归魂", direction: "上涨", weight: 35, summary: "六冲解释急涨急洗，同人解释后续重新聚合；不把六冲机械判空。" },
    ],
    archiveSummary: "8/23–31：8月最强攻击段，高波动看涨。",
    ichingEvidence: { primaryHexagram: "离为火（六冲）", changingHexagram: "天火同人（归魂）", notes: "子孙未土发动化妻财申金；另见妻财酉金；世爻兄弟巳火。" },
    version: 6, status: "published", sourceType: "ICHING_RESEARCH", publishedAt: DUAL_TEACHER_FINAL_AT, lockedAt: DUAL_TEACHER_FINAL_AT, validationStatus: "UNVERIFIED",
  },
  {
    id: "HYPE-M1-20260801-V6", assetId: "hype", forecastType: "MONTH_1",
    periodStart: "2026-08-01", periodEnd: "2026-08-31", direction: "震荡上涨",
    upProbability: 49, sidewaysProbability: 32, downProbability: 19,
    summary: "HYPE八月月卦为火天大有（归魂）化火风鼎。老师01不把‘大有’直接当上涨票，而是结合三段周卦：8/9–16偏弱、8/17–23先跌后修复、8/23以后子孙化财转强。老师02按归魂→鼎理解为先反复重整、后完成一次重新定价。月度最终定性不是单边多，而是‘先弱后强、月底最强’。",
    expectedPath: "月内先消化 → 中旬再洗一次 → 8月下旬进入主要上攻/重新定价窗口。",
    supportLevels: [], resistanceLevels: [], riskLevel: "极高",
    catalysts: ["月底周卦子孙化财", "鼎卦重定价"], risks: ["归魂反复", "中旬财化兄弟", "极高波动"],
    consensusStars: 4, consensusLabel: "月卦与三段周卦合看：前弱后强，月底强度最高",
    methodViews: [
      { id: "hype-m1-t01-v6", label: "老师01·月卦继承周卦", direction: "震荡上涨", weight: 60, summary: "财爻在月内不同周段先受压、后转为子孙化财，不能把整月写成单边。" },
      { id: "hype-m1-t02-v6", label: "老师02·大有归魂→鼎", direction: "震荡上涨", weight: 40, summary: "归魂强调反复，鼎强调重整完成后的重新定价。" },
    ],
    archiveSummary: "2026年8月：先弱后强，月底最强。",
    ichingEvidence: { primaryHexagram: "火天大有（归魂）", changingHexagram: "火风鼎", notes: "原始8月月卦；最终方向同时继承8/9–16、8/17–23、8/23–31三张独立周卦。" },
    version: 6, status: "published", sourceType: "ICHING_RESEARCH", publishedAt: DUAL_TEACHER_FINAL_AT, lockedAt: DUAL_TEACHER_FINAL_AT, validationStatus: "UNVERIFIED",
  },
  {
    id: "HYPE-AUTUMN-20260901-V6", assetId: "hype", forecastType: "MONTH_3",
    periodStart: "2026-09-01", periodEnd: "2026-12-31", direction: "震荡",
    upProbability: 34, sidewaysProbability: 31, downProbability: 35,
    summary: "跨期主卦泽火革化雷火丰，另有三个月卦山地剥化地风升：它们共同说明今年剩余时间会出现一次大级别行情，但不是一路上涨。逐月独立卦给出更清楚路径：9月兄弟酉金当令压财，偏弱；10月乾为天化噬嗑进入主要突破/主升窗口；11月兄弟亥水持世、财午火伏藏，转弱；12月噬嗑化大壮六冲，继续高波动偏空。",
    expectedPath: "9月承压/剥落 → 10月主升突破 → 11月高位回撤 → 12月高波动偏空。",
    supportLevels: [], resistanceLevels: [], riskLevel: "极高",
    catalysts: ["10月乾→噬嗑突破窗口", "革→丰的大级别重估"], risks: ["9月兄弟旺克财", "11月财伏兄弟下", "12月六冲兑现"],
    consensusStars: 4, consensusLabel: "两位老师对‘9弱—10强—11/12回撤’的节奏共识较高",
    calendarMonthPath: [
      { period: "2026-09", labelZh: "2026年9月", direction: "震荡下跌", primaryHexagram: "火地晋（游魂）", changingHexagram: null, summary: "老师01：兄弟酉金持世且酉月当令，妻财卯木受冲克；老师02：晋只代表推进结构，不能见‘晋’就判涨。最终高位消化、震荡偏空。", sourceNote: "HYPE独立9月卦", riskNote: "反弹不等于新主升。" },
      { period: "2026-10", labelZh: "2026年10月", direction: "上涨", primaryHexagram: "乾为天（六冲）", changingHexagram: "火雷噬嗑", summary: "老师01未见足够强的克财结构推翻上行；老师02按乾卦动爻与噬嗑去阻，判断力量释放、突破阻力。结合山地剥→地风升的‘先剥后升’，10月定为主升观察月。", sourceNote: "HYPE独立10月卦", riskNote: "六冲意味着急涨急洗，不能追高无止损。" },
      { period: "2026-11", labelZh: "2026年11月", direction: "下跌", primaryHexagram: "水火既济", changingHexagram: "泽山咸", summary: "老师01：兄弟亥水持世，妻财午火伏其下；到亥月兄弟得令、财火受压。老师02：既济为阶段完成后防衰。月度明显转弱。", sourceNote: "HYPE独立11月卦", riskNote: "财伏 + 兄弟持世旺，是明确风险结构。" },
      { period: "2026-12", labelZh: "2026年12月", direction: "震荡下跌", primaryHexagram: "火雷噬嗑", changingHexagram: "雷天大壮（六冲）", summary: "兄弟寅木发动、财土在子月不占优势；老师02看噬嗑上层风险与大壮六冲，判断争夺和快速反抽并存，但主方向仍偏空。", sourceNote: "HYPE独立12月卦", riskNote: "不是温和阴跌，可能出现杀跌后暴力反抽。" },
    ],
    methodViews: [
      { id: "hype-autumn-t01-v6", label: "老师01·逐月六亲旺衰", direction: "震荡", weight: 60, summary: "9月财受酉金压制，10月压力缓解，11月财伏兄弟下，12月兄弟动且财弱。" },
      { id: "hype-autumn-t02-v6", label: "老师02·革→丰 + 剥→升 + 独立月卦", direction: "震荡", weight: 40, summary: "大周期不是直线牛市，而是先剥、后升、再进入高位兑现。" },
    ],
    archiveSummary: "9–12月：9弱、10主升、11转弱、12高波动偏空。",
    ichingEvidence: { primaryHexagram: "泽火革", changingHexagram: "雷火丰", notes: "到年底大卦；同期另有山地剥→地风升中期卦，支持‘先剥后升’。逐月方向以四张独立月卦优先。" },
    version: 6, status: "published", sourceType: "ICHING_RESEARCH", publishedAt: DUAL_TEACHER_FINAL_AT, lockedAt: DUAL_TEACHER_FINAL_AT, validationStatus: "UNVERIFIED",
  },
  {
    id: "HYPE-Y1-20260731-V6", assetId: "hype", forecastType: "YEAR_1",
    periodStart: "2026-07-31", periodEnd: "2027-07-31", direction: "震荡上涨",
    upProbability: 45, sidewaysProbability: 34, downProbability: 21,
    summary: "未来一年主卦风山渐化火山旅。老师01把财爻、子孙与兄弟旺衰作为方向基础，认为短期秋季并不平滑；老师02对渐卦采用专属滤网，不能见‘渐’就直接判持续上涨，旅卦又强调资金和叙事迁移。结合9–12月独立卦和2027谦→升，最终仍偏向中期抬升，但必须经历明显回撤。",
    expectedPath: "2026秋季先弱 → 10月出现强上攻 → 11–12月回撤 → 2027逐步进入阶梯式改善。",
    supportLevels: [], resistanceLevels: [], riskLevel: "极高",
    catalysts: ["2027谦→升", "生态与流动性扩张"], risks: ["旅卦迁移", "Q4剧烈回撤", "高波动"],
    consensusStars: 3, consensusLabel: "中期偏多，但路径极不平滑，不能外推成连续主升",
    methodViews: [
      { id: "hype-y1-t01-v6", label: "老师01·大周期六亲继承", direction: "震荡上涨", weight: 60, summary: "财/子孙长期仍有抬升条件，但秋季兄弟与月令会阶段性压制。" },
      { id: "hype-y1-t02-v6", label: "老师02·渐专属滤网→旅", direction: "震荡上涨", weight: 40, summary: "渐代表循序推进而非直线，旅强调中途频繁换手与迁移。" },
    ],
    archiveSummary: "未来1年：总体偏多，但先经历Q4大波动，再看2027阶梯抬升。",
    ichingEvidence: { primaryHexagram: "风山渐（归魂）", changingHexagram: "火山旅（六合）", notes: "原始1年卦；另有中期兑为泽→天雷无妄（六冲）作为‘阶段快速反向/大波动’交叉证据。" },
    version: 6, status: "published", sourceType: "ICHING_RESEARCH", publishedAt: DUAL_TEACHER_FINAL_AT, lockedAt: DUAL_TEACHER_FINAL_AT, validationStatus: "UNVERIFIED",
  },
  {
    id: "HYPE-Y2027-20260809-V6", assetId: "hype", forecastType: "YEAR_3",
    periodStart: "2027-01-01", periodEnd: "2027-12-31", direction: "震荡上涨",
    upProbability: 49, sidewaysProbability: 34, downProbability: 17,
    summary: "2027独立年卦地山谦化地风升。老师01看子孙亥水持世可生财木，官鬼午火发动化子孙亥水，风险力量向支持端转化；财卯木虽伏藏，意味着上涨不会一开始就完全外显。老师02按谦→升判断为低调积累后逐级抬升。",
    expectedPath: "前段蓄势 → 中后段阶梯抬高；更像慢牛/阶梯式上涨，不是妖币式直线拉升。",
    supportLevels: [], resistanceLevels: [], riskLevel: "极高", catalysts: ["官鬼化子孙", "谦→升"], risks: ["财爻伏藏", "长期高波动"],
    consensusStars: 4, consensusLabel: "两位老师一致偏多：先藏后升、阶梯上涨",
    methodViews: [
      { id: "hype-2027-t01-v6", label: "老师01·子孙生财/风险转化", direction: "上涨", weight: 60, summary: "子孙亥水持世并可生财木，官鬼午火化子孙亥水；财伏说明启动偏慢。" },
      { id: "hype-2027-t02-v6", label: "老师02·谦→升", direction: "上涨", weight: 40, summary: "先谦后升，偏向积累后的持续抬高。" },
    ],
    archiveSummary: "2027：先藏后升，阶梯式偏多。",
    ichingEvidence: { primaryHexagram: "地山谦", changingHexagram: "地风升", notes: "子孙亥水持世；妻财卯木伏藏；官鬼午火发动化子孙亥水。" },
    version: 6, status: "published", sourceType: "ICHING_RESEARCH", publishedAt: DUAL_TEACHER_FINAL_AT, lockedAt: DUAL_TEACHER_FINAL_AT, validationStatus: "UNVERIFIED",
  },
  {
    id: "HYPE-Y10-20260731-V6", assetId: "hype", forecastType: "YEAR_10",
    periodStart: "2026-07-31", periodEnd: "2036-07-31", direction: "震荡",
    upProbability: 35, sidewaysProbability: 39, downProbability: 26,
    summary: "十年卦天雷无妄（六冲）化坎为水（六冲）。老师01不把长期财运简化成单边涨跌，六亲结构提示高赔率与高淘汰风险并存；老师02连续两层六冲并进入坎，强调多轮重大意外、流动性冲击和极深回撤。长期若存续成功仍可能出现巨幅上行，但绝不是可忽略周期的稳定复利资产。",
    expectedPath: "多轮大牛熊/大回撤/再定价并存；长期价值取决于平台存续、流动性与生态兑现。",
    supportLevels: [], resistanceLevels: [], riskLevel: "极高", catalysts: ["平台长期存续", "生态扩张", "交易流动性"], risks: ["双六冲", "坎险", "技术/监管/平台淘汰"],
    consensusStars: 2, consensusLabel: "长期只给高波动成长属性，不给十年单边方向承诺",
    methodViews: [
      { id: "hype-y10-t01-v6", label: "老师01·长期财爻/存续风险", direction: "震荡", weight: 60, summary: "长期财运与风险力量反复切换，不能按单边持有模型处理。" },
      { id: "hype-y10-t02-v6", label: "老师02·无妄六冲→坎六冲", direction: "震荡", weight: 40, summary: "连续六冲与坎险意味着重大意外、极端波动与多轮周期。" },
    ],
    archiveSummary: "10年：高成长潜力、高淘汰风险、多轮极端牛熊。",
    ichingEvidence: { primaryHexagram: "天雷无妄（六冲）", changingHexagram: "坎为水（六冲）", notes: "长期风险卦，不把六冲或坎机械等同永久看跌；只锁定高周期性与极端回撤属性。" },
    version: 6, status: "published", sourceType: "ICHING_RESEARCH", publishedAt: DUAL_TEACHER_FINAL_AT, lockedAt: DUAL_TEACHER_FINAL_AT, validationStatus: "UNVERIFIED",
  },
];

export const SOL_DUAL_TEACHER_FINAL_20260810: ConvictionPeriodForecast[] = [
  {
    id: "SOL-W1-20260809-V3", assetId: "sol", forecastType: "WEEK",
    periodStart: "2026-08-09", periodEnd: "2026-08-16", direction: "震荡上涨",
    upProbability: 46, sidewaysProbability: 34, downProbability: 20,
    summary: "双导师最终版：老师01看到子孙巳火发动化妻财未土，先形成生财/化财推动；妻财未土随后化官鬼酉金，说明上涨过程中伴随明显风险，但世爻兄弟卯木在申月受压，克财能力下降。老师02按巽为风六冲化火风鼎，判断先震荡、后完成重整和抬升。综合不再写成旧版‘冲高回落’，而定为先震后强、整体偏多。",
    expectedPath: "前段震荡/回踩 → 中段反复 → 后半周更容易转强；若急涨仍防财化鬼带来的快速回吐。",
    supportLevels: [], resistanceLevels: [], riskLevel: "极高", catalysts: ["子孙化财", "兄弟卯木在申月受压", "鼎卦重整"], risks: ["财化官鬼", "六冲", "7×24急反"],
    consensusStars: 4, consensusLabel: "两位老师综合偏多，但明确保留中途财化鬼回撤",
    methodViews: [
      { id: "sol-w1-t01-v3", label: "老师01·财爻动变/目标月令", direction: "震荡上涨", weight: 65, summary: "子孙巳火先化财未土形成推动；财再化官鬼增加风险，但兄弟卯木在申月受压，整体仍略偏多。" },
      { id: "sol-w1-t02-v3", label: "老师02·巽六冲→鼎/动爻时序", direction: "震荡上涨", weight: 35, summary: "六冲负责前段快速变化，鼎对应后段重整完成后的抬升。" },
    ],
    archiveSummary: "8/9–16：先震荡/回踩，后半周偏强。",
    ichingEvidence: { primaryHexagram: "巽为风（六冲）", changingHexagram: "火风鼎", notes: "原图2026-08-09 16:29，丙午年丙申月乙卯日甲申时，日空子丑。世兄弟卯木；子孙巳火动化妻财未土；妻财未土动化官鬼酉金。" },
    rollingUpdate: { asOf: DUAL_TEACHER_FINAL_AT, label: "双导师最终复核 · V3", summary: "旧V1/V2保留；V3按两套老师方法将正式结论改为先震后强、整体偏多。", originalLockedView: "旧版本保留用于审计。", timingTolerance: "完整周路径验证，不用单日涨跌替代周结论。" },
    version: 3, status: "published", sourceType: "ICHING_RESEARCH", publishedAt: DUAL_TEACHER_FINAL_AT, lockedAt: DUAL_TEACHER_FINAL_AT, validationStatus: "UNVERIFIED",
  },
  {
    id: "SOL-W2-20260817-V3", assetId: "sol", forecastType: "WEEK_2",
    periodStart: "2026-08-17", periodEnd: "2026-08-23", direction: "冲高回落",
    upProbability: 27, sidewaysProbability: 29, downProbability: 44,
    summary: "老师01看到妻财未土发动化兄弟寅木，财转兄弟是明显减分；虽然世爻父母亥水化妻财戌土带来一次拉升/承接，但不足以盖过主财爻转弱。老师02按泽风大过游魂化山风蛊归魂，强调过载后先出问题、再修问题。综合锁定为8月风险最大的一周，主路径偏冲高回落/下跌。",
    expectedPath: "前段可能还有最后冲高 → 随后过载回撤/快速下杀 → 后段允许修复，但整周仍按偏空验证。",
    supportLevels: [], resistanceLevels: [], riskLevel: "极高", catalysts: ["后段世爻化财修复"], risks: ["财化兄弟", "大过过载", "急跌风险"],
    consensusStars: 4, consensusLabel: "财化兄弟 + 大过过载共同指向风险周；后段修复不改主方向",
    methodViews: [
      { id: "sol-w2-t01-v3", label: "老师01·财化兄弟优先", direction: "下跌", weight: 65, summary: "妻财未土动化兄弟寅木是主弱信号；世爻后化财只保留修复空间。" },
      { id: "sol-w2-t02-v3", label: "老师02·大过→蛊/特殊卦滤网", direction: "冲高回落", weight: 35, summary: "大过对应过载，蛊对应问题暴露后的修复，先风险后修复。" },
    ],
    archiveSummary: "8/17–23：8月风险最大一周，偏冲高回落/下跌。",
    ichingEvidence: { primaryHexagram: "泽风大过（游魂）", changingHexagram: "山风蛊（归魂）", notes: "妻财未土动化兄弟寅木；官鬼酉金动化父母子水；父母亥水世爻动化妻财戌土。" },
    version: 3, status: "published", sourceType: "ICHING_RESEARCH", publishedAt: DUAL_TEACHER_FINAL_AT, lockedAt: DUAL_TEACHER_FINAL_AT, validationStatus: "UNVERIFIED",
  },
  {
    id: "SOL-W3-20260824-V3", assetId: "sol", forecastType: "WEEK_3",
    periodStart: "2026-08-24", periodEnd: "2026-08-30", direction: "上涨",
    upProbability: 56, sidewaysProbability: 28, downProbability: 16,
    summary: "老师01看目标仍处申月，妻财子水得金生，世爻官鬼寅木逢申冲，风险端受制；老师02按山天大畜化风雷益，判断先积累、后增益。两位老师方向一致偏多，属于8月下旬重新启动窗口。",
    expectedPath: "前段蓄势 → 中段突破 → 后段扩张；回踩只要不破坏承接结构，仍按上涨周处理。",
    supportLevels: [], resistanceLevels: [], riskLevel: "极高", catalysts: ["申月生财", "官鬼寅木受冲", "大畜→益"], risks: ["财动化父母的阶段兑现", "高波动"],
    consensusStars: 4, consensusLabel: "财旺、鬼弱、大畜→益三项共振偏多",
    methodViews: [
      { id: "sol-w3-t01-v3", label: "老师01·财鬼旺衰", direction: "上涨", weight: 65, summary: "财子水得申月生扶，世官鬼寅木受冲，风险端削弱。" },
      { id: "sol-w3-t02-v3", label: "老师02·大畜→益", direction: "上涨", weight: 35, summary: "大畜先蓄、益后增，偏向蓄势后的上行释放。" },
    ],
    archiveSummary: "8/24–30：重新转强，先蓄势后上。",
    ichingEvidence: { primaryHexagram: "山天大畜", changingHexagram: "风雷益", notes: "妻财子水应爻发动；世爻官鬼寅木发动；目标申月生财水、冲官鬼寅木。" },
    version: 3, status: "published", sourceType: "ICHING_RESEARCH", publishedAt: DUAL_TEACHER_FINAL_AT, lockedAt: DUAL_TEACHER_FINAL_AT, validationStatus: "UNVERIFIED",
  },
  {
    id: "SOL-M1-20260801-V3", assetId: "sol", forecastType: "MONTH_1",
    periodStart: "2026-08-01", periodEnd: "2026-08-31", direction: "上涨",
    upProbability: 54, sidewaysProbability: 29, downProbability: 17,
    summary: "8月月卦天泽履化天雷无妄六冲。老师01看子孙申金持世并在申月当令，伏藏妻财子水得生；应爻官鬼卯木化寅木且受申月压制，月度主方向偏多。老师02把履理解为谨慎推进，把无妄六冲解释为突然反向洗盘，所以8月是上涨月，但不是低波动上涨月。",
    expectedPath: "8月整体向上，但中间有大幅洗盘：8/9–16先震后强 → 8/17–23风险回撤 → 8/24以后重新启动。",
    supportLevels: [], resistanceLevels: [], riskLevel: "极高", catalysts: ["子孙申金持世当令", "伏财子水得生"], risks: ["无妄六冲", "中旬大过风险周"],
    consensusStars: 4, consensusLabel: "两位老师都偏向8月上涨，但必须接受中旬大洗盘",
    methodViews: [
      { id: "sol-m1-t01-v3", label: "老师01·世财鬼旺衰", direction: "上涨", weight: 65, summary: "子孙申金持世当令生伏财，官鬼木受申月压制。" },
      { id: "sol-m1-t02-v3", label: "老师02·履→无妄六冲", direction: "震荡上涨", weight: 35, summary: "谨慎推进中穿插突然反向，六冲只放大波动。" },
    ],
    archiveSummary: "2026年8月：整体上涨、高波动，中旬有明显风险周。",
    ichingEvidence: { primaryHexagram: "天泽履", changingHexagram: "天雷无妄（六冲）", notes: "世爻子孙申金；妻财子水伏藏；应爻官鬼卯木发动化寅木。" },
    version: 3, status: "published", sourceType: "ICHING_RESEARCH", publishedAt: DUAL_TEACHER_FINAL_AT, lockedAt: DUAL_TEACHER_FINAL_AT, validationStatus: "UNVERIFIED",
  },
  {
    id: "SOL-AUTUMN-20260901-V3", assetId: "sol", forecastType: "MONTH_3",
    periodStart: "2026-09-01", periodEnd: "2026-12-31", direction: "震荡下跌",
    upProbability: 27, sidewaysProbability: 31, downProbability: 42,
    summary: "到年底大卦天水讼游魂化天泽履，主轴就是争夺后谨慎前行。四张独立月卦更清楚：9月大有化小畜，高位消化偏弱；10月蛊化艮六冲，财戌土得月令，先修复上涨后滞涨；11月豫六合化震六冲，财未土持世动化父母子水，是整组最明确的风险月；12月萃化小过游魂，财卯木动化兄弟申金，弱势震荡。",
    expectedPath: "9月高位消化 → 10月修复上涨后受阻 → 11月快速下杀风险 → 12月弱势整理。",
    supportLevels: [], resistanceLevels: [], riskLevel: "极高", catalysts: ["10月财戌土得令后的修复"], risks: ["9月兄弟酉金压力", "11月财化父母+六合转六冲", "12月财化兄弟"],
    consensusStars: 4, consensusLabel: "秋冬整体偏弱，10月只是修复窗口，11月风险最大",
    calendarMonthPath: [
      { period: "2026-09", labelZh: "2026年9月", direction: "震荡下跌", primaryHexagram: "火天大有（归魂）", changingHexagram: "风天小畜", summary: "老师01：酉月兄弟酉金力量强，财寅木受压；子孙子水持世提供托底。老师02：大有转小畜是由大到小、力量收敛。最终高位消化偏弱，不看崩盘。", sourceNote: "SOL独立9月卦", riskNote: "反弹仍可能出现，但不定义为新主升。" },
      { period: "2026-10", labelZh: "2026年10月", direction: "上涨", primaryHexagram: "山风蛊（归魂）", changingHexagram: "艮为山（六冲）", summary: "老师01：戌月妻财戌土得月令，父母亥水动化子孙午火可再生财土；老师02：蛊为修复，艮为止。定性为前中段修复上涨、后段滞涨。", sourceNote: "SOL独立10月卦", riskNote: "上涨有终点，后半月防受阻。" },
      { period: "2026-11", labelZh: "2026年11月", direction: "下跌", primaryHexagram: "雷地豫（六合）", changingHexagram: "震为雷（六冲）", summary: "老师01：妻财未土持世发动化父母子水，亥月土财失势；老师02：豫初段过度乐观后转震，六合稳定结构被六冲打破。11月是最明确风险窗口。", sourceNote: "SOL独立11月卦", riskNote: "存在快速下杀/突发冲击风险。" },
      { period: "2026-12", labelZh: "2026年12月", direction: "震荡下跌", primaryHexagram: "泽地萃", changingHexagram: "雷山小过（游魂）", summary: "老师01：妻财卯木发动化兄弟申金，兄弟压力吞噬反弹；老师02：萃→小过只支持小步修复，不支持大级别反转。", sourceNote: "SOL独立12月卦", riskNote: "小反弹可以有，大反转暂不看。" },
    ],
    methodViews: [
      { id: "sol-autumn-t01-v3", label: "老师01·逐月六亲旺衰", direction: "震荡下跌", weight: 60, summary: "9月兄弟压财，10月财得令修复，11月财泄，12月财化兄弟。" },
      { id: "sol-autumn-t02-v3", label: "老师02·讼→履 + 四张月卦", direction: "震荡下跌", weight: 40, summary: "年底主轴是持续争夺与谨慎前行，10月反弹不改变秋冬总体偏弱。" },
    ],
    archiveSummary: "9–12月：9弱、10修复、11大风险、12弱势整理。",
    ichingEvidence: { primaryHexagram: "天水讼（游魂）", changingHexagram: "天泽履", notes: "到2026年底大卦；逐月方向优先使用9/10/11/12四张独立月卦。" },
    version: 3, status: "published", sourceType: "ICHING_RESEARCH", publishedAt: DUAL_TEACHER_FINAL_AT, lockedAt: DUAL_TEACHER_FINAL_AT, validationStatus: "UNVERIFIED",
  },
  {
    id: "SOL-Y2027-20260809-V3", assetId: "sol", forecastType: "YEAR_1",
    periodStart: "2027-01-01", periodEnd: "2027-12-31", direction: "震荡下跌",
    upProbability: 24, sidewaysProbability: 35, downProbability: 41,
    summary: "2027独立年卦泽火革化泽山咸。老师01看到兄弟亥水持世，妻财午火伏在兄弟之下，子孙卯木发动又化官鬼辰土，支持端后续转为风险。老师02把革理解为结构变化，而不是必然上涨；咸代表重新寻找平衡。2027整体明显弱于HYPE。",
    expectedPath: "全年多次结构切换和反弹，但大级别以震荡偏弱/整理为主。",
    supportLevels: [], resistanceLevels: [], riskLevel: "极高", catalysts: ["结构改革/生态变化"], risks: ["财伏兄弟下", "子孙化官鬼", "高波动"],
    consensusStars: 3, consensusLabel: "两位老师均不支持2027直接定义为大牛年",
    methodViews: [
      { id: "sol-2027-t01-v3", label: "老师01·财伏兄弟/子孙化鬼", direction: "下跌", weight: 65, summary: "财午火伏在世兄弟亥水下，子孙卯木动化官鬼辰土。" },
      { id: "sol-2027-t02-v3", label: "老师02·革→咸", direction: "震荡", weight: 35, summary: "结构变化后寻找新平衡，不能用‘革’字直接看牛。" },
    ],
    archiveSummary: "2027：震荡偏弱，大级别整理，明显弱于HYPE。",
    ichingEvidence: { primaryHexagram: "泽火革", changingHexagram: "泽山咸", notes: "妻财午火伏于世爻兄弟亥水；子孙卯木应爻发动化官鬼辰土。" },
    version: 3, status: "published", sourceType: "ICHING_RESEARCH", publishedAt: DUAL_TEACHER_FINAL_AT, lockedAt: DUAL_TEACHER_FINAL_AT, validationStatus: "UNVERIFIED",
  },
  {
    id: "SOL-Y2028-20260809-V3", assetId: "sol", forecastType: "YEAR_3",
    periodStart: "2028-01-01", periodEnd: "2028-12-31", direction: "震荡上涨",
    upProbability: 45, sidewaysProbability: 36, downProbability: 19,
    summary: "2028独立卦山天大畜静卦。老师01看到两处妻财子水明现，虽然世爻官鬼寅木仍代表约束，但财并未被兄弟直接压制；老师02把大畜理解为积累、蓄力和等待释放。结构明显好于2027，但静卦意味着节奏慢。",
    expectedPath: "长期积累 → 阶梯式改善 → 等待更大级别释放；不按快速主升理解。",
    supportLevels: [], resistanceLevels: [], riskLevel: "极高", catalysts: ["双财子水", "大畜蓄势"], risks: ["静卦节奏慢", "官鬼持世"],
    consensusStars: 3, consensusLabel: "2028结构转好，但属于蓄势偏多而非快速牛市",
    methodViews: [
      { id: "sol-2028-t01-v3", label: "老师01·双财/官鬼持世", direction: "震荡上涨", weight: 60, summary: "两处财子水明现且未受兄弟直接压制，结构好于2027。" },
      { id: "sol-2028-t02-v3", label: "老师02·大畜静卦", direction: "震荡上涨", weight: 40, summary: "大畜以积累蓄势为主，静卦使趋势释放偏慢。" },
    ],
    archiveSummary: "2028：积累、蓄势、重新转强。",
    ichingEvidence: { primaryHexagram: "山天大畜", changingHexagram: null, notes: "静卦；妻财子水两现；世爻官鬼寅木。" },
    version: 3, status: "published", sourceType: "ICHING_RESEARCH", publishedAt: DUAL_TEACHER_FINAL_AT, lockedAt: DUAL_TEACHER_FINAL_AT, validationStatus: "UNVERIFIED",
  },
  {
    id: "SOL-Y10-20260809-V3", assetId: "sol", forecastType: "YEAR_10",
    periodStart: "2026-08-09", periodEnd: "2036-08-09", direction: "震荡",
    upProbability: 31, sidewaysProbability: 40, downProbability: 29,
    summary: "十年卦水雷屯游魂化泽火革。老师01看到财午火伏藏、官鬼动后转兄弟，长期竞争与风险结构反复；老师02按屯→革理解为从困难开局到多轮结构重构。它不支持把SOL写成十年稳定复利，也不等于十年永久看空。",
    expectedPath: "多轮牛熊、技术迭代、生态重构并存；长期方向取决于网络竞争力和真实应用兑现。",
    supportLevels: [], resistanceLevels: [], riskLevel: "极高", catalysts: ["生态扩张", "协议升级", "真实应用"], risks: ["官鬼化兄弟", "技术替代", "监管/流动性", "多轮周期重构"],
    consensusStars: 2, consensusLabel: "长期只锁定高周期性与结构重构，不给单边承诺",
    methodViews: [
      { id: "sol-y10-t01-v3", label: "老师01·长期六亲结构", direction: "震荡", weight: 60, summary: "财伏与官鬼/兄弟转换说明长期竞争和风险反复。" },
      { id: "sol-y10-t02-v3", label: "老师02·屯→革", direction: "震荡", weight: 40, summary: "困难开局后进入多轮革新重构，长期需持续验证。" },
    ],
    archiveSummary: "10年：大周期重构反复，不按稳定复利资产处理。",
    ichingEvidence: { primaryHexagram: "水雷屯（游魂）", changingHexagram: "泽火革", notes: "妻财午火伏藏；官鬼等动爻后转兄弟；世爻子孙寅木。" },
    version: 3, status: "published", sourceType: "ICHING_RESEARCH", publishedAt: DUAL_TEACHER_FINAL_AT, lockedAt: DUAL_TEACHER_FINAL_AT, validationStatus: "UNVERIFIED",
  },
];

export function listHypePeriodForecasts20260809() {
  return [...listMuHypePeriodForecasts("hype"), ...HYPE_UPDATE_FORECASTS_20260809, ...HYPE_TEACHER_REVIEW_FORECASTS_20260809, ...HYPE_DUAL_TEACHER_FINAL_20260810];
}

export function listSolPeriodForecasts20260809() {
  return [...SOL_PERIOD_FORECASTS_20260809, ...SOL_TEACHER_REVIEW_FORECASTS_20260809, ...SOL_DUAL_TEACHER_FINAL_20260810].filter((item) => item.status === "published");
}

export function periodLabelForHype20260809(type: ConvictionForecastType) {
  return HYPE_UPDATED_PERIOD_LABELS[type] ?? ASTEROID_PERIOD_LABELS[type];
}

export function periodLabelForSol20260809(type: ConvictionForecastType) {
  return SOL_PERIOD_LABELS[type] ?? ASTEROID_PERIOD_LABELS[type];
}

export function hypePeriodMeta20260809() {
  const periods = listHypePeriodForecasts20260809();
  return HYPE_UPDATED_VISIBLE_PERIOD_ORDER.map((type) => ({
    type,
    labelZh: periodLabelForHype20260809(type).zh,
    emptyZh: periodLabelForHype20260809(type).emptyZh,
    hasResearch: periods.some((item) => item.forecastType === type),
  }));
}

export function solPeriodMeta20260809() {
  const periods = listSolPeriodForecasts20260809();
  return SOL_VISIBLE_PERIOD_ORDER.map((type) => ({
    type,
    labelZh: periodLabelForSol20260809(type).zh,
    emptyZh: periodLabelForSol20260809(type).emptyZh,
    hasResearch: periods.some((item) => item.forecastType === type),
  }));
}
