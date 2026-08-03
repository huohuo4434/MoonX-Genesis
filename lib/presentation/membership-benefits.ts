export type MembershipBenefitRow = {
  feature: string;
  free: string;
  paid: string;
};

export const FREE_USER_LABEL = "免费注册用户";
export const PAID_MEMBER_LABEL = "付费会员";

export const CORE_MARKETS = [
  "BTC",
  "ETH",
  "美股",
  "A股",
  "港股",
  "黄金",
  "白银",
  "原油",
] as const;

export const MEMBERSHIP_BENEFIT_ROWS: MembershipBenefitRow[] = [
  { feature: "当日核心市场预测", free: "北京时间08:00后查看", paid: "全天提前查看完整内容" },
  { feature: "上涨／震荡／下跌概率", free: "基础展示", paid: "完整展示" },
  { feature: "运行路径", free: "基础展示", paid: "完整展示" },
  { feature: "下一交易日方向", free: "—", paid: "✓" },
  { feature: "支撑、压力与入场确认", free: "—", paid: "✓" },
  { feature: "失效条件与风险提示", free: "—", paid: "✓" },
  { feature: "周度行情路径", free: "—", paid: "✓" },
  { feature: "月度趋势", free: "功能预览", paid: "✓" },
  { feature: "六爻、奇门与技术依据", free: "方法说明", paid: "完整依据" },
  { feature: "方法共识度／AI综合评定", free: "摘要", paid: "完整展示" },
  { feature: "重点资产研究", free: "公开摘要", paid: "完整研究" },
  { feature: "模拟交易公开记录与会员信号", free: "公开说明／成绩摘要", paid: "完整内容" },
];

export const PAID_MEMBER_BENEFITS = MEMBERSHIP_BENEFIT_ROWS.filter(
  (item) => item.paid !== "—"
).map((item) => item.feature);

export const FREE_USER_BENEFITS = MEMBERSHIP_BENEFIT_ROWS.filter(
  (item) => item.free !== "—"
).map((item) => item.feature);
