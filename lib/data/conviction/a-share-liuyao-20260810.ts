import {
  type ConvictionForecastType,
  type ConvictionPeriodForecast,
} from "@/lib/data/conviction/asteroid-forecasts";

export type AShareResearchAssetId = "lexin-medical" | "lian-tech" | "ganfeng-lithium";

export const A_SHARE_RESEARCH_ASSET_IDS: AShareResearchAssetId[] = [
  "lexin-medical",
  "lian-tech",
  "ganfeng-lithium",
];

export function isAShareResearchAssetId(value: string): value is AShareResearchAssetId {
  return (A_SHARE_RESEARCH_ASSET_IDS as string[]).includes(value);
}

// Existing ConvictionForecastType does not define separate MONTH_2/MONTH_3 calendar-month keys.
// Keep the storage keys stable and provide explicit labels below. These are research-slot keys only.
export const A_SHARE_PERIOD_ORDER: ConvictionForecastType[] = ["MONTH_1", "MONTH_3", "YEAR_1", "YEAR_3"];
export const A_SHARE_VISIBLE_PERIOD_ORDER = A_SHARE_PERIOD_ORDER;

const LABELS: Record<ConvictionForecastType, { zh: string; en: string; emptyZh: string }> = {
  TODAY: { zh: "今日", en: "Today", emptyZh: "该周期预测尚未发布" },
  TOMORROW: { zh: "明日", en: "Tomorrow", emptyZh: "该周期预测尚未发布" },
  WEEK: { zh: "本周", en: "Week", emptyZh: "该周期预测尚未发布" },
  WEEK_2: { zh: "下周", en: "Next week", emptyZh: "该周期预测尚未发布" },
  WEEK_3: { zh: "第三周", en: "Week 3", emptyZh: "该周期预测尚未发布" },
  WEEK_4: { zh: "第四周", en: "Week 4", emptyZh: "该周期预测尚未发布" },
  MONTH_1: { zh: "8月", en: "August", emptyZh: "8月研究尚未发布" },
  MONTH_3: { zh: "9月", en: "September", emptyZh: "9月研究尚未发布" },
  YEAR_1: { zh: "10月", en: "October", emptyZh: "10月研究尚未发布" },
  YEAR_3: { zh: "近3个月", en: "Next 3 months", emptyZh: "近3个月研究尚未发布" },
  YEAR_5: { zh: "5年", en: "5Y", emptyZh: "该周期预测尚未发布" },
  YEAR_10: { zh: "10年", en: "10Y", emptyZh: "该周期预测尚未发布" },
};

export function aSharePeriodLabel20260810(type: ConvictionForecastType) {
  return LABELS[type];
}

const PUBLISHED_AT = "2026-08-10T17:46:00+08:00";

function common(input: Omit<ConvictionPeriodForecast, "supportLevels" | "resistanceLevels" | "riskLevel" | "sourceType" | "publishedAt" | "lockedAt" | "validationStatus" | "status" | "version">): ConvictionPeriodForecast {
  return {
    ...input,
    supportLevels: [],
    resistanceLevels: [],
    riskLevel: "高",
    version: 1,
    status: "published",
    sourceType: "ICHING_RESEARCH",
    publishedAt: PUBLISHED_AT,
    lockedAt: PUBLISHED_AT,
    validationStatus: "UNVERIFIED",
  };
}

export const A_SHARE_LIUYAO_FORECASTS_20260810: ConvictionPeriodForecast[] = [
  // 乐心医疗 300562
  common({
    id: "LEXIN-202608-M1-V1", assetId: "lexin-medical", forecastType: "MONTH_1",
    periodStart: "2026-08-10", periodEnd: "2026-08-31", direction: "震荡下跌",
    upProbability: 20, sidewaysProbability: 30, downProbability: 50,
    summary: "老师01按金融卦六亲旺衰看：妻财寅木伏藏，目标申月冲寅，财弱；子孙子水又落旬空，兄弟申金当令，8月价格端承压。老师02看天山遁→泽山咸，先退、后感应，支持‘先弱后有修复’，但不支持当前追涨。",
    expectedPath: "8月先退、整理为主，中后段允许出现承接和反弹，但整月仍按偏弱处理。",
    catalysts: ["调整后的承接修复", "后段咸卦感应"],
    risks: ["财爻伏且月破", "子孙旬空", "申金兄弟当令"],
    consensusStars: 4, consensusLabel: "两位老师都指向先弱后修复，8月不宜追涨",
    methodViews: [
      { id: "lexin-aug-t1", label: "老师01·六亲旺衰", direction: "震荡下跌", weight: 65, summary: "财寅木伏且受申月冲，子孙子水空，价格端偏弱。" },
      { id: "lexin-aug-t2", label: "老师02·主卦路径", direction: "先跌后涨", weight: 35, summary: "遁→咸更像先退后产生承接/反应。" },
    ],
    ichingEvidence: { primaryHexagram: "天山遁", changingHexagram: "泽山咸", notes: "原卦题：乐心医疗8月走势。财寅木伏，申月冲寅；子孙子水旬空。" },
  }),
  common({
    id: "LEXIN-202609-M2-V1", assetId: "lexin-medical", forecastType: "MONTH_3",
    periodStart: "2026-09-01", periodEnd: "2026-09-30", direction: "震荡下跌",
    upProbability: 30, sidewaysProbability: 40, downProbability: 30,
    summary: "老师01看酉月金旺，对木财仍有压制，兄弟金的竞争/兑现力量不低；但动变中财开始被引出，较8月已有改善。老师02看泽山咸→泽天夬，修复中会出现一次更明确的表态，但不足以定为持续主升。",
    expectedPath: "9月弱中有反弹，偏震荡消化；中后段的修复强于月初，但仍不是最优追涨月。",
    catalysts: ["财爻被引出", "中后段修复"], risks: ["酉月金旺压木财", "反弹后兑现"],
    consensusStars: 3, consensusLabel: "改善但未形成强多共振",
    methodViews: [
      { id: "lexin-sep-t1", label: "老师01·财爻与月令", direction: "震荡下跌", weight: 65, summary: "酉月金旺，木财仍承压，但较8月有所修复。" },
      { id: "lexin-sep-t2", label: "老师02·咸→夬", direction: "震荡", weight: 35, summary: "咸后夬允许出现一次更明确反弹/表态。" },
    ],
    ichingEvidence: { primaryHexagram: "泽山咸", changingHexagram: "泽天夬", notes: "原卦题：乐心医疗9月走势。按目标酉月复核。" },
  }),
  common({
    id: "LEXIN-202610-M3-V1", assetId: "lexin-medical", forecastType: "YEAR_1",
    periodStart: "2026-10-01", periodEnd: "2026-10-31", direction: "上涨",
    upProbability: 58, sidewaysProbability: 27, downProbability: 15,
    summary: "老师01看到妻财酉金明现、子孙未土可生财金，目标戌月土旺，对财形成支持；这是8—10月里结构最明显改善的一月。老师02看火山旅（六合）→离为火（六冲），主方向转强，但后程振幅会明显放大。",
    expectedPath: "10月前中段更容易进入主升/强势窗口；若中后段出现快速加速和连续大阳，六冲更像提示高位分歧，应逐步兑现。",
    catalysts: ["子孙土生财金", "戌月土旺", "三个月大卦后段走强"], risks: ["离为火六冲", "后段快速回吐"],
    consensusStars: 5, consensusLabel: "两位老师共同指向10月转强，但后段高波动",
    methodViews: [
      { id: "lexin-oct-t1", label: "老师01·生财结构", direction: "上涨", weight: 70, summary: "子孙未土生妻财酉金，戌月土旺，价格结构明显转强。" },
      { id: "lexin-oct-t2", label: "老师02·旅→离", direction: "震荡上涨", weight: 30, summary: "六合到六冲：前中段有行情，后段振幅扩大。" },
    ],
    ichingEvidence: { primaryHexagram: "火山旅（六合）", changingHexagram: "离为火（六冲）", notes: "原卦题：乐心医疗10月走势。财酉金、子孙未土；目标戌月复核。" },
  }),
  common({
    id: "LEXIN-3M-20260810-V1", assetId: "lexin-medical", forecastType: "YEAR_3",
    periodStart: "2026-08-10", periodEnd: "2026-10-31", direction: "先跌后涨",
    upProbability: 50, sidewaysProbability: 30, downProbability: 20,
    summary: "近3个月大卦火天大有（归魂）→雷火丰，与分月结构合并后更像前弱后强：8月退、9月修复、10月释放。金融方向仍以各月六亲旺衰为主，不用‘大有/丰’卦名直接替代方向。",
    expectedPath: "8月弱势整理 → 9月修复 → 10月进入最值得交易的强势窗口。",
    catalysts: ["10月财爻得生", "后段强窗口"], risks: ["前两月磨人", "10月六冲高波动"],
    consensusStars: 4, consensusLabel: "大周期与分月共同支持前弱后强",
    methodViews: [
      { id: "lexin-3m-t1", label: "老师01·分月六亲", direction: "先跌后涨", weight: 70, summary: "8月财弱、9月修复、10月财得生。" },
      { id: "lexin-3m-t2", label: "老师02·大有→丰", direction: "先跌后涨", weight: 30, summary: "大有→丰只解释后段扩张，与分月10月强窗口相互印证。" },
    ],
    ichingEvidence: { primaryHexagram: "火天大有（归魂）", changingHexagram: "雷火丰", notes: "原卦题：乐心医疗近3个月走势。" },
  }),

  // 利安科技 300784
  common({
    id: "LIAN-202608-M1-V1", assetId: "lian-tech", forecastType: "MONTH_1",
    periodStart: "2026-08-10", periodEnd: "2026-08-31", direction: "冲高回落",
    upProbability: 25, sidewaysProbability: 30, downProbability: 45,
    summary: "老师01看妻财寅木发动，但目标申月直接冲寅，财爻月破；财又化官鬼午火，子孙子水旬空，资金推动难稳定。老师02看火天大有（归魂）→火山旅（六合），前面可以热闹、冲高，后面更像失去稳定。",
    expectedPath: "8月仍可能有反弹或冲高，但越拉越应防回落；如果中后段出现快速拉升，更偏兑现窗口而非追涨点。",
    catalysts: ["短线反弹", "高波动资金推动"], risks: ["财爻月破", "财化官鬼", "子孙空亡"],
    consensusStars: 4, consensusLabel: "两位老师共同指向冲高后转弱",
    methodViews: [
      { id: "lian-aug-t1", label: "老师01·财爻动变", direction: "冲高回落", weight: 70, summary: "财寅木动但在申月破，又化官鬼，持续性不足。" },
      { id: "lian-aug-t2", label: "老师02·大有→旅", direction: "冲高回落", weight: 30, summary: "前强后漂，越到后段越不稳定。" },
    ],
    ichingEvidence: { primaryHexagram: "火天大有（归魂）", changingHexagram: "火山旅（六合）", notes: "原卦题：利安科技8月走势。妻财寅木发动，目标申月冲寅。" },
  }),
  common({
    id: "LIAN-202609-M2-V1", assetId: "lian-tech", forecastType: "MONTH_3",
    periodStart: "2026-09-01", periodEnd: "2026-09-30", direction: "下跌",
    upProbability: 15, sidewaysProbability: 25, downProbability: 60,
    summary: "老师01最不利的是财转兄弟，代表价格/资金优势转为争夺与抛压；老师02看泽风大过（游魂）→巽为风（六冲），属于过载后再进入六冲，9月是三个月里最明显的风险窗口。",
    expectedPath: "9月更偏持续调整和高波动下行；即使有反弹，也以降低风险、而非追涨处理。",
    catalysts: ["超跌反抽"], risks: ["财化兄弟", "大过过载", "六冲放大波动"],
    consensusStars: 5, consensusLabel: "两位老师极强看跌共识",
    methodViews: [
      { id: "lian-sep-t1", label: "老师01·财化兄弟", direction: "下跌", weight: 70, summary: "财最终转兄弟，是明显抛压/争夺结构。" },
      { id: "lian-sep-t2", label: "老师02·大过→巽六冲", direction: "下跌", weight: 30, summary: "过载后六冲，风险集中释放。" },
    ],
    ichingEvidence: { primaryHexagram: "泽风大过（游魂）", changingHexagram: "巽为风（六冲）", notes: "原卦题：利安科技9月走势。" },
  }),
  common({
    id: "LIAN-202610-M3-V1", assetId: "lian-tech", forecastType: "YEAR_1",
    periodStart: "2026-10-01", periodEnd: "2026-10-31", direction: "震荡下跌",
    upProbability: 20, sidewaysProbability: 45, downProbability: 35,
    summary: "老师01能看到局部生财因素，但不足以形成明确强多；老师02天地否（六合）→天水讼（游魂）更像不通与争执，10月较9月可缓和，却仍不具备主升共识。",
    expectedPath: "10月偏筑底和反复，弱于乐心医疗与第三只锂业研究对象；有反弹也先按修复看待。",
    catalysts: ["超跌修复", "筑底"], risks: ["否→讼结构", "缺乏持续生财共振"],
    consensusStars: 4, consensusLabel: "弱势缓和但未转成多头共振",
    methodViews: [
      { id: "lian-oct-t1", label: "老师01·六亲旺衰", direction: "震荡下跌", weight: 65, summary: "存在局部生财，但不足以扭转整体弱势。" },
      { id: "lian-oct-t2", label: "老师02·否→讼", direction: "震荡下跌", weight: 35, summary: "不通后争执，适合看筑底而非主升。" },
    ],
    ichingEvidence: { primaryHexagram: "天地否（六合）", changingHexagram: "天水讼（游魂）", notes: "原卦题：利安科技10月走势。" },
  }),
  common({
    id: "LIAN-3M-20260810-V1", assetId: "lian-tech", forecastType: "YEAR_3",
    periodStart: "2026-08-10", periodEnd: "2026-10-31", direction: "先涨后跌",
    upProbability: 25, sidewaysProbability: 35, downProbability: 40,
    summary: "三个月大卦火天大有（归魂）→山天大畜，结合分月更像8月尚有冲高，9月风险集中，10月只进入筑底/约束阶段。大畜在这里更偏蓄住而不是释放。",
    expectedPath: "8月冲高机会 → 9月明显转弱 → 10月反复筑底；当前三个月里没有理想的主动追涨月。",
    catalysts: ["8月短线冲高", "10月筑底"], risks: ["9月极强空头共识", "中期动能被约束"],
    consensusStars: 4, consensusLabel: "大周期与分月都不支持8—10月持续主升",
    methodViews: [
      { id: "lian-3m-t1", label: "老师01·分月六亲", direction: "先涨后跌", weight: 70, summary: "8月仍可能冲高，9月财化兄弟后明显走弱。" },
      { id: "lian-3m-t2", label: "老师02·大有→大畜", direction: "先涨后跌", weight: 30, summary: "前面有表现，后面被蓄住/约束。" },
    ],
    ichingEvidence: { primaryHexagram: "火天大有（归魂）", changingHexagram: "山天大畜", notes: "原卦题：利安科技近3个月走势。" },
  }),

  // 赣锋锂业 002460：原卦题曾误写“赣南锂业”，用户已确认实际占问对象为赣锋锂业。
  common({
    id: "GANFENG-202608-M1-V1", assetId: "ganfeng-lithium", forecastType: "MONTH_1",
    periodStart: "2026-08-10", periodEnd: "2026-08-31", direction: "震荡",
    upProbability: 35, sidewaysProbability: 45, downProbability: 20,
    summary: "老师01看妻财未土发动化妻财戌土，属于财化财，价格端仍有力量；但目标申月土生金、财有泄，故不宜追涨。老师02看泽风大过（游魂）→天风姤，更像高波动中突然出现拉升/相遇机会。",
    expectedPath: "8月以震荡洗盘为主，期间可能突然拉升；更适合等回踩，不适合追一根急涨。",
    catalysts: ["财化财", "突然拉升窗口"], risks: ["申月泄财", "大过高波动", "原卦题曾误写，已由用户确认对象为赣锋锂业002460"],
    consensusStars: 3, consensusLabel: "价格端有力但8月更偏洗盘与突发行情",
    methodViews: [
      { id: "ganfeng-aug-t1", label: "老师01·财化财", direction: "震荡上涨", weight: 65, summary: "财未土动化财戌土，价格力量仍在，但申月泄土。" },
      { id: "ganfeng-aug-t2", label: "老师02·大过→姤", direction: "震荡", weight: 35, summary: "高波动中容易突然出现机会，不支持一路追。" },
    ],
    ichingEvidence: { primaryHexagram: "泽风大过（游魂）", changingHexagram: "天风姤", notes: "原卦题曾误写“赣南锂业8月走势”；用户已确认实际对象为赣锋锂业002460。" },
  }),
  common({
    id: "GANFENG-202609-M2-V1", assetId: "ganfeng-lithium", forecastType: "MONTH_3",
    periodStart: "2026-09-01", periodEnd: "2026-09-30", direction: "上涨",
    upProbability: 52, sidewaysProbability: 33, downProbability: 15,
    summary: "老师01看妻财酉金在目标酉月直接值月，财爻主导力明显增强；兄弟午火到酉月已不像夏季强，克财能力下降。老师02看火水未济静卦，方向改善但推动速度不会太快。",
    expectedPath: "9月逐步修复、慢慢抬高，更适合回踩布局而不是等10月已经走强后再追。",
    catalysts: ["财酉金值月", "兄弟火退势"], risks: ["静卦节奏慢", "原卦题曾误写，已由用户确认对象为赣锋锂业002460"],
    consensusStars: 4, consensusLabel: "老师01明确转强，老师02支持慢修复",
    methodViews: [
      { id: "ganfeng-sep-t1", label: "老师01·财爻值月", direction: "上涨", weight: 70, summary: "妻财酉金在酉月值月，价格端占上风。" },
      { id: "ganfeng-sep-t2", label: "老师02·未济静卦", direction: "震荡上涨", weight: 30, summary: "未济静卦表示仍在完成过程中，偏慢抬升。" },
    ],
    ichingEvidence: { primaryHexagram: "火水未济", changingHexagram: null, notes: "静卦。原卦题曾误写“赣南锂业9月走势”；用户已确认实际对象为赣锋锂业002460。目标酉月复核。" },
  }),
  common({
    id: "GANFENG-202610-M3-V1", assetId: "ganfeng-lithium", forecastType: "YEAR_1",
    periodStart: "2026-10-01", periodEnd: "2026-10-31", direction: "上涨",
    upProbability: 62, sidewaysProbability: 28, downProbability: 10,
    summary: "老师01最强信号是妻财戌土持世且目标戌月值月，财爻既居核心又得月令，是三只股票10月结构里最干净的一组。老师02山雷颐（游魂）静卦偏积累、滋养，支持稳定强势而非妖股式直线暴涨。",
    expectedPath: "10月更偏稳定强势/震荡上行；若9月已经低位布局，可把10月作为主要持有和逐步兑现窗口。",
    catalysts: ["财戌土持世", "财爻值月"], risks: ["静卦不代表无回撤", "原卦题曾误写，已由用户确认对象为赣锋锂业002460"],
    consensusStars: 5, consensusLabel: "财持世值月，三只股票10月最强结构",
    methodViews: [
      { id: "ganfeng-oct-t1", label: "老师01·财持世值月", direction: "上涨", weight: 75, summary: "妻财戌土持世且戌月当令，主价格力量最强。" },
      { id: "ganfeng-oct-t2", label: "老师02·颐静卦", direction: "震荡上涨", weight: 25, summary: "颐主积累滋养，更像稳步抬高而非急拉。" },
    ],
    ichingEvidence: { primaryHexagram: "山雷颐（游魂）", changingHexagram: null, notes: "静卦。妻财戌土持世，目标戌月值月。原卦题曾误写“赣南锂业10月走势”；用户已确认实际对象为赣锋锂业002460。" },
  }),
  common({
    id: "GANFENG-3M-20260810-V1", assetId: "ganfeng-lithium", forecastType: "YEAR_3",
    periodStart: "2026-08-10", periodEnd: "2026-10-31", direction: "先跌后涨",
    upProbability: 55, sidewaysProbability: 30, downProbability: 15,
    summary: "三个月大卦地水师（归魂）→坤为地（六冲）中，官鬼辰土发动化妻财巳火，老师01视为风险因素向财转换；与分月8月洗盘、9月转强、10月财持世值月一致。老师02提醒最终坤六冲，10月底以后不能继续外推。",
    expectedPath: "8月洗盘 → 9月逐步转强 → 10月最强；10月底以后重新起卦，不用本卦无限外推。",
    catalysts: ["官鬼化财", "9—10月财旺"], risks: ["最终坤六冲", "10月底后需重新评估", "原卦题曾误写，已由用户确认对象为赣锋锂业002460"],
    consensusStars: 4, consensusLabel: "分月与三个月大卦共同支持后段转强",
    methodViews: [
      { id: "ganfeng-3m-t1", label: "老师01·官鬼化财", direction: "先跌后涨", weight: 70, summary: "风险端动后化财，与9—10月财旺结构衔接。" },
      { id: "ganfeng-3m-t2", label: "老师02·师→坤六冲", direction: "先跌后涨", weight: 30, summary: "前段整理、后段释放，但坤六冲要求10月底重新评估。" },
    ],
    ichingEvidence: { primaryHexagram: "地水师（归魂）", changingHexagram: "坤为地（六冲）", notes: "官鬼辰土发动化妻财巳火。原卦题曾误写“赣南锂业近3个月走势”；用户已确认实际对象为赣锋锂业002460。" },
  }),
];

export function listASharePeriodForecasts20260810(assetId: AShareResearchAssetId): ConvictionPeriodForecast[] {
  return A_SHARE_LIUYAO_FORECASTS_20260810.filter((item) => item.assetId === assetId);
}

export function aSharePeriodMeta20260810(assetId: AShareResearchAssetId) {
  const rows = listASharePeriodForecasts20260810(assetId);
  return A_SHARE_VISIBLE_PERIOD_ORDER.map((type) => ({
    type,
    labelZh: aSharePeriodLabel20260810(type).zh,
    emptyZh: aSharePeriodLabel20260810(type).emptyZh,
    hasResearch: rows.some((item) => item.forecastType === type && item.status === "published"),
  }));
}
