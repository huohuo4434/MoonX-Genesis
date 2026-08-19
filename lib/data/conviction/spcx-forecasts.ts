import type { ConvictionForecastType, ConvictionPeriodForecast } from "@/lib/data/conviction/asteroid-forecasts";

const PUBLISHED_AT = "2026-08-08T20:50:00+08:00";
const LOCKED_AT = PUBLISHED_AT;

export const SPCX_PERIOD_ORDER: ConvictionForecastType[] = ["WEEK", "WEEK_2", "WEEK_3", "MONTH_1", "MONTH_3", "YEAR_1", "YEAR_5"];
export const SPCX_VISIBLE_PERIOD_ORDER: ConvictionForecastType[] = ["WEEK_2", "WEEK_3", "MONTH_1", "MONTH_3", "YEAR_1", "YEAR_5"];

function forecast(input: Omit<ConvictionPeriodForecast, "assetId" | "status" | "sourceType" | "publishedAt" | "lockedAt" | "validationStatus">): ConvictionPeriodForecast {
  return {
    ...input,
    assetId: "spcx",
    status: "published",
    sourceType: "ICHING_RESEARCH",
    publishedAt: PUBLISHED_AT,
    lockedAt: LOCKED_AT,
    validationStatus: "UNVERIFIED",
  };
}

export const SPCX_PERIOD_FORECASTS: ConvictionPeriodForecast[] = [
  forecast({
    id: "SPCX-W1-20260810-V2", forecastType: "WEEK", periodStart: "2026-08-10", periodEnd: "2026-08-16",
    direction: "震荡上涨", upProbability: 50, sidewaysProbability: 35, downProbability: 15,
    summary: "突破确认与高波动扩张。前段强势已经启动，本周重点是确认、换手和第二段上攻。",
    expectedPath: "先确认135附近突破，允许回踩换手，再观察第二段上攻。",
    supportLevels: ["109.20", "130.64"], resistanceLevels: ["135", "138.62"], confirmationLevel: "站稳135并保持突破结构", invalidationLevel: "日线重新跌破109—110承接区", riskLevel: "VERY_HIGH",
    catalysts: ["突破确认", "供给吸收", "风险偏好"], risks: ["解锁供给", "高波动", "冲高回吐"],
    ichingEvidence: { primaryHexagram: "天风姤", changingHexagram: "乾为天（六冲）", notes: "力量扩张，但六冲放大波动。" }, version: 2,
    dailyPath: [
      { date: "2026-08-10", status: "预测", direction: "震荡上涨", consensusStars: 4, summary: "先测试135枢轴；突破确认后看延续，受阻则先回踩。", confirmation: "135上方形成有效确认" },
      { date: "2026-08-11", status: "预测", direction: "震荡", consensusStars: 3, summary: "大涨后的换手与洗盘，重点看回踩承接。" },
      { date: "2026-08-12", status: "预测", direction: "震荡上涨", consensusStars: 4, summary: "完成换手后进入第二次方向选择，结构完整则偏向二次上攻。" },
      { date: "2026-08-13", status: "预测", direction: "上涨", consensusStars: 4, summary: "偏强延续窗口，确认突破后更容易抬高高低点。" },
      { date: "2026-08-14", status: "预测", direction: "震荡上涨", consensusStars: 3, summary: "偏强中防周末兑现，重点看周线收盘质量。" },
    ],
  }),
  forecast({
    id: "SPCX-W2-20260817-V2", forecastType: "WEEK_2", periodStart: "2026-08-17", periodEnd: "2026-08-23",
    direction: "震荡上涨", upProbability: 48, sidewaysProbability: 37, downProbability: 15,
    summary: "强势延续，但第二轮供给压力提高，偏多同时要防冲高回落。",
    expectedPath: "若前一周守住突破结构，本周偏强延续；快速远离均线或新增供给时先进入震荡兑现。",
    supportLevels: ["130.64", "135"], resistanceLevels: ["138.62"], confirmationLevel: "回踩后仍守住突破区", invalidationLevel: "放量跌回突破前结构", riskLevel: "HIGH",
    catalysts: ["突破延续", "承接", "风险偏好"], risks: ["第二轮供给", "高位兑现", "高波动"],
    ichingEvidence: { primaryHexagram: "乾为天", changingHexagram: "天泽履", notes: "强中有戒，趋势延续需要纪律。" }, version: 2,
  }),
  forecast({
    id: "SPCX-W3-20260824-V2", forecastType: "WEEK_3", periodStart: "2026-08-24", periodEnd: "2026-08-30",
    direction: "震荡上涨", upProbability: 52, sidewaysProbability: 35, downProbability: 13,
    summary: "全月结构较顺。前面若已透支涨幅，更可能高位稳定后再上；若前面充分整理，则更容易加速。",
    expectedPath: "高位稳定或回踩后再上。",
    supportLevels: ["135"], resistanceLevels: ["138.62"], confirmationLevel: "回踩保持高低点抬升", invalidationLevel: "跌回前期主要承接区", riskLevel: "HIGH",
    catalysts: ["趋势延续", "结构稳定"], risks: ["前期涨幅透支", "高位兑现"],
    ichingEvidence: { primaryHexagram: "地天泰（六合）", changingHexagram: null, notes: "泰卦静卦，结构相对顺畅。" }, version: 2,
  }),
  forecast({
    id: "SPCX-M1-20260806-V2", forecastType: "MONTH_1", periodStart: "2026-08-06", periodEnd: "2026-09-06",
    direction: "震荡上涨", upProbability: 50, sidewaysProbability: 35, downProbability: 15,
    summary: "月度偏上，涨势已经前置启动；后半月重点看延续质量和兑现节奏。",
    expectedPath: "早段急拉—中段确认—后段延续与兑现并存。",
    supportLevels: ["109.20", "130.64"], resistanceLevels: ["135", "138.62"], confirmationLevel: "突破区持续获得承接", invalidationLevel: "日线重新跌破109—110承接区", riskLevel: "VERY_HIGH",
    catalysts: ["增长预期", "供给吸收"], risks: ["估值", "解锁", "获利兑现"],
    ichingEvidence: { primaryHexagram: "雷地豫（六合）", changingHexagram: "火地晋（游魂）", notes: "月内仍支持推进，但后段兑现风险上升。" }, version: 2,
  }),
  forecast({
    id: "SPCX-M3-20260806-V2", forecastType: "MONTH_3", periodStart: "2026-08-06", periodEnd: "2026-11-06",
    direction: "震荡上涨", upProbability: 48, sidewaysProbability: 35, downProbability: 17,
    summary: "三个月由剧烈分歧转向修复增益，方向偏正但波动很大。", expectedPath: "先高波动分歧，再观察中段修复。",
    supportLevels: [], resistanceLevels: [], confirmationLevel: "基本面和资金未出现破坏性变化", invalidationLevel: "出现新的破坏性基本面或流动性事件", riskLevel: "VERY_HIGH",
    catalysts: ["业务增长", "资金修复"], risks: ["六冲高波动", "估值", "供给"],
    ichingEvidence: { primaryHexagram: "离为火（六冲）", changingHexagram: "风雷益", notes: "六冲放大来回，变益支持后续修复。" }, version: 2,
  }),
  forecast({
    id: "SPCX-Y1-202608-V2", forecastType: "YEAR_1", periodStart: "2026-08-01", periodEnd: "2027-08-31",
    direction: "震荡上涨", upProbability: 45, sidewaysProbability: 38, downProbability: 17,
    summary: "一年维度偏高成长、高投入、等待兑现，不是稳定直线上涨。", expectedPath: "大波段推进，期间反复受资本开支、估值和供给压制。",
    supportLevels: [], resistanceLevels: [], confirmationLevel: "增长兑现与融资环境保持", invalidationLevel: "增长兑现持续低于预期", riskLevel: "VERY_HIGH",
    catalysts: ["Starlink", "Starship", "AI基础设施"], risks: ["资本开支", "估值", "供给"],
    ichingEvidence: { primaryHexagram: "地水师（归魂）", changingHexagram: "水天需（游魂）", notes: "组织扩张与等待兑现并存。" }, version: 2,
  }),
  forecast({
    id: "SPCX-Y5-2026-V2", forecastType: "YEAR_5", periodStart: "2026-01-01", periodEnd: "2031-12-31",
    direction: "震荡上涨", upProbability: 48, sidewaysProbability: 35, downProbability: 17,
    summary: "五年长期偏成长与增益，但会被估值、资本投入和阶段性供给反复压制。", expectedPath: "高波动成长，受约束后蓄力再推进。",
    supportLevels: [], resistanceLevels: [], confirmationLevel: "长期业务增长持续兑现", invalidationLevel: "核心增长逻辑发生实质破坏", riskLevel: "VERY_HIGH",
    catalysts: ["长期增长", "规模扩张"], risks: ["估值", "资本强度", "供给"],
    ichingEvidence: { primaryHexagram: "风雷益", changingHexagram: "风天小畜", notes: "长期增益与阶段约束并存。" }, version: 2,
  }),
];

export function listSpcxPeriodForecasts(): ConvictionPeriodForecast[] {
  return SPCX_PERIOD_FORECASTS.map((row) => ({ ...row, supportLevels: [...row.supportLevels], resistanceLevels: [...row.resistanceLevels], catalysts: [...row.catalysts], risks: [...row.risks], dailyPath: row.dailyPath?.map((day) => ({ ...day })) }));
}

export function spcxPeriodMeta() {
  const labels: Partial<Record<ConvictionForecastType, string>> = { WEEK: "8/10–16", WEEK_2: "8/17–23", WEEK_3: "8/24–30", MONTH_1: "1个月", MONTH_3: "3个月", YEAR_1: "1年", YEAR_5: "5年" };
  return SPCX_VISIBLE_PERIOD_ORDER.map((type) => ({ type, labelZh: labels[type] ?? type, emptyZh: "该周期预测尚未发布", hasResearch: SPCX_PERIOD_FORECASTS.some((row) => row.forecastType === type) }));
}
