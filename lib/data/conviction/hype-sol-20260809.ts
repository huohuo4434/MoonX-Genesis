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
];

export const HYPE_UPDATED_PERIOD_LABELS: Partial<
  Record<ConvictionForecastType, { zh: string; en: string; emptyZh: string }>
> = {
  WEEK: { zh: "原周卦", en: "Prior week", emptyZh: "该周期预测尚未发布" },
  WEEK_2: { zh: "8/9–16", en: "Aug 9–16", emptyZh: "8/9–16周卦尚未发布" },
  WEEK_3: { zh: "8/17–23", en: "Aug 17–23", emptyZh: "8/17–23周卦尚未发布" },
  WEEK_4: { zh: "8/23–31", en: "Aug 23–31", emptyZh: "8/23–31周卦尚未发布" },
  MONTH_1: { zh: "8月", en: "August", emptyZh: "8月研究尚未发布" },
  MONTH_3: { zh: "3个月", en: "3M", emptyZh: "3个月研究尚未发布" },
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

export function listHypePeriodForecasts20260809() {
  return [...listMuHypePeriodForecasts("hype"), ...HYPE_UPDATE_FORECASTS_20260809, ...HYPE_TEACHER_REVIEW_FORECASTS_20260809];
}

export function listSolPeriodForecasts20260809() {
  return [...SOL_PERIOD_FORECASTS_20260809, ...SOL_TEACHER_REVIEW_FORECASTS_20260809].filter((item) => item.status === "published");
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
