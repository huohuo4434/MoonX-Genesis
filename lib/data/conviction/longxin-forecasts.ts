/**
 * 长鑫科技多周期六爻研究。
 * 来源：用户2026-07-26/28上传的原始卦图。
 * 重点关注页只展示本周与1个月；3个月、1年、10年进入总趋势资料库。
 */
import type {
  ConvictionForecastType,
  ConvictionPeriodForecast,
} from "@/lib/data/conviction/asteroid-forecasts";

const PUBLISHED_AT = "2026-07-31T21:20:00+08:00";

export const LONGXIN_VISIBLE_PERIOD_ORDER: ConvictionForecastType[] = ["WEEK", "MONTH_1"];
export const LONGXIN_FULL_PERIOD_ORDER: ConvictionForecastType[] = [
  "WEEK",
  "MONTH_1",
  "MONTH_3",
  "YEAR_1",
  "YEAR_10",
];

export const LONGXIN_PERIOD_FORECASTS: ConvictionPeriodForecast[] = [
  {
    id: "CXMT-WEEK-20260728-V2",
    assetId: "cxmt",
    forecastType: "WEEK",
    periodStart: "2026-07-28",
    periodEnd: "2026-08-02",
    direction: "冲高回落",
    upProbability: 36,
    sidewaysProbability: 35,
    downProbability: 29,
    summary:
      "本周资金关注度仍高，但财爻虽持世却受未月刑、卯日克，承接并不稳定。父母爻发动后分别化财、化子孙，说明消息与规则能够带来阶段性推动，但更容易表现为冲高后分歧扩大。",
    expectedPath:
      "高波动开局，盘中可能先冲高；随后换手和估值分歧增加，后半段以回落整理或宽幅震荡为主。",
    supportLevels: [],
    resistanceLevels: [],
    riskLevel: "高",
    catalysts: ["新股关注度", "存储产业景气", "父母爻动化财与子孙"],
    risks: ["财爻受月日压制", "游魂结构持续性不足", "上市初期换手剧烈"],
    consensusStars: 3,
    consensusLabel: "六爻内部信号有利有弊，方向存在分歧",
    methodViews: [
      {
        id: "liuyiao-current-week",
        label: "六爻·本周卦",
        direction: "冲高回落",
        weight: 70,
        summary: "财爻戌土持世但受克，父母爻动化财/子孙，先有推动、后有分歧。",
      },
      {
        id: "liuyiao-opening-week",
        label: "六爻·开盘周补充卦",
        direction: "震荡下跌",
        weight: 30,
        summary: "财爻伏藏且世爻子孙动化父母，提示热度高但持续性偏弱。",
      },
    ],
    ichingEvidence: {
      primaryHexagram: "山雷颐",
      changingHexagram: "风地观",
      notes:
        "主卦财爻戌土持世，未月戌土受刑、卯日木克土；父母子水两动，一化妻财未土、一化子孙巳火。开盘周补充卦为地山谦化水山蹇，财卯木伏于官鬼午火之下，世子孙亥水动化父母戌土。",
    },
    version: 2,
    status: "published",
    sourceType: "ICHING_RESEARCH",
    publishedAt: PUBLISHED_AT,
    lockedAt: PUBLISHED_AT,
    validationStatus: "UNVERIFIED",
  },
  {
    id: "CXMT-M1-20260728-V2",
    assetId: "cxmt",
    forecastType: "MONTH_1",
    periodStart: "2026-07-28",
    periodEnd: "2026-08-27",
    direction: "先涨后跌",
    upProbability: 27,
    sidewaysProbability: 30,
    downProbability: 43,
    summary:
      "一个月尺度偏谨慎。妻财午火发动后化兄弟亥水，属于财化兄；子孙卯木发动后化官鬼未土，生财动力转为风险。世爻官鬼丑土又逢未月冲，说明上市热度之后更容易进入估值消化和波动回落。",
    expectedPath:
      "前段仍可能依靠新股热度和产业叙事上冲；中后段换手、估值和获利盘压力增加，回落概率逐步提高。",
    supportLevels: [],
    resistanceLevels: [],
    riskLevel: "高",
    catalysts: ["AI存储需求", "国产替代预期", "新股关注度"],
    risks: ["财化兄", "子孙化官鬼", "世爻月破", "高估值与获利盘"],
    consensusStars: 4,
    consensusLabel: "月卦多个关键信号共同指向后程承压",
    methodViews: [
      {
        id: "liuyiao-month",
        label: "六爻·1个月",
        direction: "先涨后跌",
        weight: 100,
        summary: "财化兄、子孙化官鬼且世爻受冲，中后段承压信号较一致。",
      },
    ],
    ichingEvidence: {
      primaryHexagram: "地火明夷",
      changingHexagram: "山地剥",
      notes:
        "妻财午火发动化兄弟亥水；子孙卯木发动化官鬼未土；世爻官鬼丑土处未月受冲。按财爻、子孙、世爻旺衰判断，月内前强后弱。",
    },
    version: 2,
    status: "published",
    sourceType: "ICHING_RESEARCH",
    publishedAt: PUBLISHED_AT,
    lockedAt: PUBLISHED_AT,
    validationStatus: "UNVERIFIED",
  },
  {
    id: "CXMT-M3-20260728-V1",
    assetId: "cxmt",
    forecastType: "MONTH_3",
    periodStart: "2026-07-28",
    periodEnd: "2026-10-28",
    direction: "先跌后涨",
    upProbability: 42,
    sidewaysProbability: 32,
    downProbability: 26,
    summary:
      "三个月总趋势更像先消化上市初期波动，再逐步修复。财爻伏藏但得子孙飞神相生，兄弟午火发动后化财申金，说明竞争与抛压经过消化后仍可能重新转为资金支持。",
    expectedPath: "前段回撤与磨底，中段反复整理，后段出现渐进修复机会。",
    supportLevels: [],
    resistanceLevels: [],
    riskLevel: "高",
    catalysts: ["兄弟动化财", "存储产业周期"],
    risks: ["财爻伏藏", "官鬼动化兄弟", "新股波动"],
    archiveSummary: "三个月：先消化、后修复，后程强于前程。",
    ichingEvidence: {
      primaryHexagram: "山水蒙",
      changingHexagram: "风山渐",
      notes: "财酉金伏于子孙戌土之下；兄弟午火动化妻财申金，官鬼子水动化兄弟巳火。",
    },
    version: 1,
    status: "published",
    sourceType: "ICHING_RESEARCH",
    publishedAt: PUBLISHED_AT,
    lockedAt: PUBLISHED_AT,
    validationStatus: "UNVERIFIED",
  },
  {
    id: "CXMT-Y1-20260728-V1",
    assetId: "cxmt",
    forecastType: "YEAR_1",
    periodStart: "2026-07-28",
    periodEnd: "2027-07-28",
    direction: "先跌后涨",
    upProbability: 35,
    sidewaysProbability: 34,
    downProbability: 31,
    summary:
      "一年尺度不是持续单边上涨。财爻午火伏在兄弟亥水之后，资金释放受抑；后续变卦趋于既济，说明经历估值和产业兑现考验后，仍有重新稳定的机会。",
    expectedPath: "先经历较长波动和估值消化，再观察基本面兑现后的稳定修复。",
    supportLevels: [],
    resistanceLevels: [],
    riskLevel: "高",
    catalysts: ["产业兑现", "技术升级", "供需周期改善"],
    risks: ["财爻伏藏受克", "兄弟爻旺", "盈利兑现不及预期"],
    archiveSummary: "一年：先承压、后趋稳，关键看产业兑现。",
    ichingEvidence: {
      primaryHexagram: "地火明夷",
      changingHexagram: "水火既济",
      notes: "妻财午火伏于兄弟亥水之下，兄弟亥水发动化官鬼戌土。长期先受压，后看结构稳定。",
    },
    version: 1,
    status: "published",
    sourceType: "ICHING_RESEARCH",
    publishedAt: PUBLISHED_AT,
    lockedAt: PUBLISHED_AT,
    validationStatus: "UNVERIFIED",
  },
  {
    id: "CXMT-Y10-20260728-V1",
    assetId: "cxmt",
    forecastType: "YEAR_10",
    periodStart: "2026-07-28",
    periodEnd: "2036-07-28",
    direction: "震荡上涨",
    upProbability: 40,
    sidewaysProbability: 34,
    downProbability: 26,
    summary:
      "十年材料支持产业长期存续与多轮复苏，但不支持十年直线上涨。两处财爻发动后均化兄弟，说明每轮财富扩张都会受到竞争、资本开支和产业周期消耗。",
    expectedPath: "多轮扩张、竞争和深度回撤交替，长期价值取决于周期管理。",
    supportLevels: [],
    resistanceLevels: [],
    riskLevel: "高",
    catalysts: ["国产DRAM长期需求", "产业复苏循环"],
    risks: ["财化兄", "资本开支", "技术竞争", "多轮周期回撤"],
    archiveSummary: "十年：产业可存续，但财富在竞争与周期中反复消耗。",
    ichingEvidence: {
      primaryHexagram: "地雷复",
      changingHexagram: "水地比",
      notes: "妻财亥水动化兄弟戌土，妻财子水持世动化兄弟未土；子孙酉金在变卦化财子水。",
    },
    version: 1,
    status: "published",
    sourceType: "ICHING_RESEARCH",
    publishedAt: PUBLISHED_AT,
    lockedAt: PUBLISHED_AT,
    validationStatus: "UNVERIFIED",
  },
];

export function listLongxinPeriodForecasts() {
  return LONGXIN_PERIOD_FORECASTS.filter((item) => item.status === "published");
}
