import {
  ASTEROID_PERIOD_LABELS,
  type ConvictionForecastType,
  type ConvictionPeriodForecast,
} from "@/lib/data/conviction/asteroid-forecasts";

export type VibeFocusAssetId = "googl" | "msft" | "tencent" | "kingsoft-office";

export const VIBE_FOCUS_VISIBLE_PERIOD_ORDER: ConvictionForecastType[] = ["MONTH_1"];
export const VIBE_FOCUS_PERIOD_ORDER: ConvictionForecastType[] = ["MONTH_1"];

const PUBLISHED_AT = "2026-08-02T15:20:00+08:00";

export const VIBE_FOCUS_PERIOD_FORECASTS: ConvictionPeriodForecast[] = [
  {
    id: "GOOGL-M1-20260803-V1",
    assetId: "googl",
    forecastType: "MONTH_1",
    periodStart: "2026-08-03",
    periodEnd: "2026-09-03",
    direction: "先跌后涨",
    upProbability: 48,
    sidewaysProbability: 32,
    downProbability: 20,
    summary:
      "四只新增重点资产中，Alphabet的月度卦象相对最好。财爻亥水临应，申日生财；兄弟丑土发动虽克财，但受未月冲破，抛压持续性有限。官鬼卯木持世而旬空，短期风险感较强，但形成持续下跌的力量不足。",
    expectedPath:
      "8月上旬先消化财报与资本开支分歧；8月7日进入申月后，金旺生水，财爻条件改善，中下旬更容易逐步修复并走强；月底至9月初以高位整理为主。",
    supportLevels: [],
    resistanceLevels: [],
    confirmationLevel: "进入申月后重新站稳短期平台，并出现成交与资金承接改善。",
    invalidationLevel: "若中旬后仍持续放量创新低，且Vibe财务与行业证据同步转弱，则月度偏多路径失效。",
    riskLevel: "中高",
    catalysts: ["云业务与AI收入增长", "申月生扶财爻", "广告与搜索现金流"],
    risks: ["资本开支较高", "财报后估值分歧", "监管与竞争风险"],
    aiEvidence:
      "Vibe初始客观证据偏多：财务质量与行业强度较高，估值和资本开支构成主要折价。Vibe只作为月度25%上限的方法票，不覆盖六爻结论。",
    ichingEvidence: {
      primaryHexagram: "地泽临",
      changingHexagram: "地天泰（六合）",
      notes:
        "妻财亥水临应，未月受克但得申日生；兄弟丑土发动克财但受未月冲破；官鬼卯木持世旬空并受申金制。按财爻、世应、月日与动变判断，前弱后强。",
    },
    consensusStars: 4,
    consensusLabel: "六爻与Vibe客观证据方向较一致",
    methodViews: [
      {
        id: "googl-liuyiao-month",
        label: "六爻·1个月",
        direction: "先跌后涨",
        weight: 70,
        summary: "财爻后段受生，兄弟动爻受冲，风险爻旬空，支持先弱后强。",
      },
      {
        id: "googl-vibe-evidence",
        label: "Vibe客观证据",
        direction: "偏多",
        weight: 25,
        summary: "财务和行业证据较强，资本开支与估值限制短线弹性。",
      },
      {
        id: "googl-benchmark",
        label: "纳指相对强弱",
        direction: "相对强于大盘",
        weight: 5,
        summary: "个股卦象强于当前纳指月度震荡偏弱背景。",
      },
    ],
    benchmarkEvidence: {
      benchmarkSymbol: "NDX",
      benchmarkNameZh: "纳斯达克100指数",
      benchmarkDirection: "震荡下跌",
      relation: "强于大盘",
      summary: "Alphabet更可能在纳指震荡环境中走出相对强势，但仍会受系统性回撤影响。",
    },
    version: 1,
    status: "published",
    sourceType: "ICHING_RESEARCH",
    publishedAt: PUBLISHED_AT,
    lockedAt: PUBLISHED_AT,
    validationStatus: "UNVERIFIED",
  },
  {
    id: "MSFT-M1-20260803-V1",
    assetId: "msft",
    forecastType: "MONTH_1",
    periodStart: "2026-08-03",
    periodEnd: "2026-09-03",
    direction: "冲高回落",
    upProbability: 42,
    sidewaysProbability: 38,
    downProbability: 20,
    summary:
      "月初先整理，中段修复上涨，月底需要防止冲高回落。初爻兄弟未土临月发动，代表前段获利盘和市场压力；兄弟最终化妻财子水，说明压力有机会转为资金承接。上爻妻财子水发动化官鬼卯木，提示后段上涨以后风险重新显现。",
    expectedPath:
      "月初偏整理或小幅承压 → 月中修复上涨、相对强势 → 月末财化官鬼，估值与获利盘压力重新出现，防冲高回落。",
    supportLevels: [],
    resistanceLevels: [],
    confirmationLevel: "月初整理后重新站稳平台，软件板块相对强度继续领先纳指。",
    invalidationLevel: "若月中未能形成修复，且云业务或Vibe财务证据显著转弱，则原路径失效。",
    riskLevel: "中高",
    catalysts: ["Azure与企业软件增长", "AI商业化", "软件板块相对抗跌"],
    risks: ["高估值", "AI资本开支增加", "月底获利回吐"],
    aiEvidence:
      "Vibe初始证据明显偏多，主要来自财务质量和行业相对强度；六爻补充了价格节奏，强调月底不能追高。",
    ichingEvidence: {
      primaryHexagram: "水地比（归魂）",
      changingHexagram: "风雷益",
      notes:
        "兄弟未土发动化妻财子水；妻财子水发动化官鬼卯木；官鬼卯木持世旬空。先有压力转承接，后有财化官鬼，故中段偏强、后段防回落。",
    },
    consensusStars: 4,
    consensusLabel: "Vibe偏多与六爻中段修复一致，后段风险需保留",
    methodViews: [
      {
        id: "msft-liuyiao-month",
        label: "六爻·1个月",
        direction: "冲高回落",
        weight: 70,
        summary: "兄弟化财支持修复，财化官鬼提示月底风险重新出现。",
      },
      {
        id: "msft-vibe-evidence",
        label: "Vibe客观证据",
        direction: "偏多",
        weight: 25,
        summary: "财务质量、云业务与软件行业相对强度较高。",
      },
      {
        id: "msft-benchmark",
        label: "纳指相对强弱",
        direction: "相对强于大盘",
        weight: 5,
        summary: "软件与稳定现金流属性使其有望阶段性强于纳指。",
      },
    ],
    benchmarkEvidence: {
      benchmarkSymbol: "NDX",
      benchmarkNameZh: "纳斯达克100指数",
      benchmarkDirection: "震荡下跌",
      relation: "强于大盘",
      summary: "微软中段可能明显强于纳指，但月底回落风险与大盘宽幅震荡背景一致。",
    },
    version: 1,
    status: "published",
    sourceType: "ICHING_RESEARCH",
    publishedAt: PUBLISHED_AT,
    lockedAt: PUBLISHED_AT,
    validationStatus: "UNVERIFIED",
  },
  {
    id: "TENCENT-M1-20260803-V1",
    assetId: "tencent",
    forecastType: "MONTH_1",
    periodStart: "2026-08-03",
    periodEnd: "2026-09-03",
    direction: "震荡下跌",
    upProbability: 29,
    sidewaysProbability: 40,
    downProbability: 31,
    summary:
      "基本面与财爻支撑仍在，但未来一个月价格兑现能力偏弱。妻财酉金伏藏在子孙戌土之下，飞神生伏神，说明底层盈利和资金支撑存在；但财爻未直接显现，利好不等于股价立即上涨。父母寅木发动后化兄弟，消息和政策扰动容易转为资金分流。",
    expectedPath:
      "月初受政策、消息和港股情绪扰动，偏弱或下探；月中底层财爻支撑逐渐显现，进入企稳；月底可能修复，但反弹空间暂不宜看得过高。",
    supportLevels: [],
    resistanceLevels: [],
    confirmationLevel: "恒生科技止跌、腾讯重新站稳短期平台，同时Vibe现金流和事件证据保持稳定。",
    invalidationLevel: "若财爻支撑无法显现、港股资金继续流出并跌破新平台，则企稳路径失效。",
    riskLevel: "中高",
    catalysts: ["自由现金流与回购", "游戏和广告增长", "AI与云业务投入"],
    risks: ["港股风险偏好", "政策与竞争扰动", "利好伏藏、价格兑现不足"],
    aiEvidence:
      "Vibe初始客观证据偏多，但六爻认为财爻伏藏、消息化兄，形成基本面与价格节奏的部分分歧。",
    ichingEvidence: {
      primaryHexagram: "山水蒙",
      changingHexagram: "山泽损",
      notes:
        "妻财酉金伏于子孙戌土之下，飞神生伏神；初爻父母寅木发动，旬空又受申日冲，最终化兄弟。财有基础但未显，消息易转为资金分流。",
    },
    consensusStars: 3,
    consensusLabel: "基本面偏多，但价格节奏仍偏弱",
    methodViews: [
      {
        id: "tencent-liuyiao-month",
        label: "六爻·1个月",
        direction: "震荡下跌",
        weight: 70,
        summary: "伏财得生但未显，父母动化兄弟，先弱后稳。",
      },
      {
        id: "tencent-vibe-evidence",
        label: "Vibe客观证据",
        direction: "偏多",
        weight: 25,
        summary: "现金流、回购和多业务结构形成基本面支撑。",
      },
      {
        id: "tencent-benchmark",
        label: "恒生科技相对强弱",
        direction: "接近大盘、略抗跌",
        weight: 5,
        summary: "方向与恒生科技震荡偏弱相近，但龙头现金流可能带来相对抗跌。",
      },
    ],
    benchmarkEvidence: {
      benchmarkSymbol: "HSTECH",
      benchmarkNameZh: "恒生科技指数",
      benchmarkDirection: "冲高回落",
      relation: "接近大盘、略抗跌",
      summary: "腾讯与恒生科技大方向接近，底层财爻支撑使其可能比部分高波动港股更抗跌。",
    },
    version: 1,
    status: "published",
    sourceType: "ICHING_RESEARCH",
    publishedAt: PUBLISHED_AT,
    lockedAt: PUBLISHED_AT,
    validationStatus: "UNVERIFIED",
  },
  {
    id: "KINGSOFT-OFFICE-M1-20260803-V1",
    assetId: "kingsoft-office",
    forecastType: "MONTH_1",
    periodStart: "2026-08-03",
    periodEnd: "2026-09-03",
    direction: "冲高回落",
    upProbability: 22,
    sidewaysProbability: 28,
    downProbability: 50,
    summary:
      "四只新增资产中，金山办公卦象最弱。妻财寅木、卯木同时出现，但均处旬空，且木在未月入墓；妻财卯木发动化兄弟申金，形成回头克财。子孙子水持世发动后化父母戌土，支持价格的动力受到回头克制。",
    expectedPath:
      "8月初可能受业绩或AI办公消息刺激出现反抽或冲高；8月7日进入申月后，兄弟申金增强，对财爻寅卯木压制更重；中下旬回落风险较大，月底偏低位震荡。",
    supportLevels: [],
    resistanceLevels: [],
    confirmationLevel: "只有在申月后重新放量站稳平台、估值与资金证据同步改善，才可否定偏空路径。",
    invalidationLevel: "若中下旬持续走强并突破前高，且Vibe资金和估值证据明显转多，则冲高回落判断失效。",
    riskLevel: "高",
    catalysts: ["国产软件", "AI办公", "订阅化与业绩预告"],
    risks: ["财爻旬空入墓", "财化兄弟回头克", "估值与盈利质量分歧"],
    aiEvidence:
      "Vibe初始证据接近中性：产业和财务表面偏多，但估值、资金和盈利质量形成明显折价。六爻对未来一个月价格更偏空。",
    ichingEvidence: {
      primaryHexagram: "山地剥",
      changingHexagram: "水山蹇",
      notes:
        "妻财寅木、卯木均旬空并在未月入墓；妻财卯木发动化兄弟申金；子孙子水持世发动化父母戌土。主卦剥、变卦蹇，价格层面偏弱。",
    },
    consensusStars: 2,
    consensusLabel: "基本面题材与价格卦象分歧较大",
    methodViews: [
      {
        id: "kingsoft-liuyiao-month",
        label: "六爻·1个月",
        direction: "冲高回落",
        weight: 70,
        summary: "财爻空墓并化兄弟回头克，中下旬压力明显。",
      },
      {
        id: "kingsoft-vibe-evidence",
        label: "Vibe客观证据",
        direction: "中性",
        weight: 25,
        summary: "产业和业绩偏多，但估值、资金与盈利质量需要折价。",
      },
      {
        id: "kingsoft-benchmark",
        label: "上证相对强弱",
        direction: "弱于大盘",
        weight: 5,
        summary: "个股卦象明显弱于上证当前震荡或冲高回落背景。",
      },
    ],
    benchmarkEvidence: {
      benchmarkSymbol: "SSE",
      benchmarkNameZh: "上证指数",
      benchmarkDirection: "冲高回落",
      relation: "弱于大盘",
      summary: "即使上证维持震荡，金山办公仍可能出现个股级别的更大回撤。",
    },
    version: 1,
    status: "published",
    sourceType: "ICHING_RESEARCH",
    publishedAt: PUBLISHED_AT,
    lockedAt: PUBLISHED_AT,
    validationStatus: "UNVERIFIED",
  },
];

export function listVibeFocusPeriodForecasts(assetId: VibeFocusAssetId) {
  return VIBE_FOCUS_PERIOD_FORECASTS.filter(
    (item) => item.assetId === assetId && item.status === "published"
  );
}

export function vibeFocusPeriodMeta(assetId: VibeFocusAssetId) {
  const periods = listVibeFocusPeriodForecasts(assetId);
  return VIBE_FOCUS_VISIBLE_PERIOD_ORDER.map((type) => ({
    type,
    labelZh: ASTEROID_PERIOD_LABELS[type].zh,
    emptyZh: ASTEROID_PERIOD_LABELS[type].emptyZh,
    hasResearch: periods.some((item) => item.forecastType === type),
  }));
}
