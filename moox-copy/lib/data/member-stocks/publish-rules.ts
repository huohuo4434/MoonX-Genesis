import type {
  MemberStockDailyForecast,
  MemberStockPrimaryDirection,
  MemberStockWeeklyAnalysis,
} from "@/types/member-stock";

const ALLOWED: MemberStockPrimaryDirection[] = [
  "明显上涨",
  "震荡偏涨",
  "区间震荡",
  "震荡偏跌",
  "明显下跌",
  "先涨后跌",
  "先跌后涨",
];

const BANNED = [
  "观望",
  "观察承接",
  "等待确认",
  "不预设立场",
  "方向仍不确定",
  "前高后低",
  "先抑后扬",
  "偏多结构",
  "修复偏多",
  "高位惯性",
  "冲高换手",
  "资金承接区",
  "抛压区",
  "换手区",
];

function isNumericLevel(s: string): boolean {
  // Accept "38.11", "64,370美元（上一自然日低点）", "3,612点（上一交易日低点）"
  return /\d/.test(s) && !/前一交易日|资金承接|抛压区|换手区|近期支撑|本周前高/.test(s);
}

export function validateMemberStockDailyPublish(
  record: MemberStockDailyForecast
): string[] {
  const errors: string[] = [];
  if (record.status !== "published") return errors;
  if (!ALLOWED.includes(record.primaryDirection)) {
    errors.push(`主要走势无效：${record.primaryDirection}`);
  }
  if (!record.closingBias?.trim()) errors.push("缺少收盘倾向");
  if (!record.pathDirection?.trim() && !record.expectedPath?.trim()) {
    errors.push("缺少运行顺序");
  }
  if (!record.invalidation?.trim() || record.invalidation.length < 12) {
    errors.push("方向改变条件不可验证");
  }
  if (/观望|观察承接|不预设立场/.test(`${record.direction}${record.headline}${record.expectedPath}`)) {
    errors.push("正式内容含禁用措辞（观望／观察承接／不预设立场）");
  }
  for (const lv of [...record.keySupport, ...record.keyResistance]) {
    if (!isNumericLevel(lv)) {
      errors.push(`关键价位必须为具体数字：${lv}`);
    }
  }
  if (!record.headline?.trim() || record.headline === record.riskNote) {
    errors.push("只有风险提示而没有结论");
  }
  for (const b of BANNED) {
    if (record.keySupport.some((x) => x.includes(b)) || record.keyResistance.some((x) => x.includes(b))) {
      errors.push(`关键价位含无意义文案：${b}`);
    }
  }
  if (!record.keySupport.length || !/\d/.test(record.keySupport.join(""))) {
    errors.push("缺少关键支撑价格");
  }
  if (!record.keyResistance.length || !/\d/.test(record.keyResistance.join(""))) {
    errors.push("缺少关键压力价格");
  }
  if (!/(1小时|15分钟|30分钟|日线|瞬间)/.test(record.invalidation)) {
    errors.push("失效条件没有确认周期");
  }
  return errors;
}

export function validateMemberStockWeeklyPublish(
  record: MemberStockWeeklyAnalysis
): string[] {
  const errors: string[] = [];
  if (record.status !== "published") return errors;
  if (!ALLOWED.includes(record.primaryDirection)) {
    errors.push(`主要走势无效：${record.primaryDirection}`);
  }
  if (!record.closingBias?.trim()) errors.push("缺少周末／收盘倾向");
  if (!record.pathDirection?.trim() && !record.weeklyPath?.trim()) {
    errors.push("缺少运行顺序");
  }
  if (!record.invalidation?.trim() || record.invalidation.length < 12) {
    errors.push("方向改变条件不可验证");
  }
  if (/观望|观察承接|不预设立场/.test(`${record.overallDirection}${record.headline}${record.weeklyPath}`)) {
    errors.push("正式内容含禁用措辞");
  }
  for (const lv of [...record.keySupport, ...record.keyResistance]) {
    if (!isNumericLevel(lv)) errors.push(`关键价位必须为具体数字：${lv}`);
  }
  if (!record.keySupport.length || !/\d/.test(record.keySupport.join(""))) {
    errors.push("缺少关键支撑价格");
  }
  if (!record.keyResistance.length || !/\d/.test(record.keyResistance.join(""))) {
    errors.push("缺少关键压力价格");
  }
  if (!/(1小时|15分钟|30分钟|日线|瞬间)/.test(record.invalidation)) {
    errors.push("失效条件没有确认周期");
  }
  return errors;
}
