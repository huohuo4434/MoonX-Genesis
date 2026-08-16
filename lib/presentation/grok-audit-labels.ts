/**
 * MOOX public display labels consolidated from the 2026-08-16 site audit.
 * This module is display-only. It must not alter stored forecast directions,
 * verification outcomes, trading state, or execution behavior.
 */
export const PUBLIC_ZH_LABELS = {
  today: "今日",
  weekly: "本周",
  entryDesk: "入场确认",
  verification: "验证",
  featured: "重点关注",
  paidMember: "付费会员",
  locked: "已锁定",
  unverifiable: "不可验证",
  trackRecord: "公开战绩",
} as const;

export const PUBLIC_EN_LABELS = {
  today: "Today",
  weekly: "Weekly",
  entryDesk: "Entry desk",
  verification: "Verification",
  featured: "Featured",
  paidMember: "Paid member",
  locked: "Locked",
  unverifiable: "Unverifiable",
  trackRecord: "Track record",
} as const;

const DIRECTION_EN: Record<string, string> = {
  "上涨": "Up",
  "下跌": "Down",
  "震荡": "Range",
  "震荡上涨": "Range, bias up",
  "震荡下跌": "Range, bias down",
  "先涨后跌": "Up then down",
  "先跌后涨": "Down then up",
  "探底回升": "Rebound from lows",
  "冲高回落": "Spike then fade",
};

const STATUS_ZH: Record<string, string> = {
  LOCK: "锁定",
  LOCKED: "已锁定",
  UNVERIFIABLE: "不可验证",
  RESEARCH_ONLY: "仅研究、不交易",
  PUBLISHED: "已发布",
  INACTIVE: "未激活",
  SUCCESS: "成功",
  FULL_HIT: "完全命中",
  UP: "上涨",
  DOWN: "下跌",
  LONG: "做多",
  SHORT: "做空",
  TARGET1: "目标 1",
  TARGET2: "目标 2",
  BUY_TO_COVER: "回补",
  AUTO_PERCENT_PLAN: "按比例自动计划",
  "1D": "日线",
  USE_GOD: "用神",
  SIX_RELATIONS: "六亲",
  HIDDEN_SPIRIT: "伏神",
  APPROVED: "已通过审核",
};

export function directionLabelEn(value: string): string {
  return DIRECTION_EN[value] ?? value;
}

export function publicStatusLabelZh(value: string): string {
  return STATUS_ZH[value] ?? value;
}

export function formatMOOXDateZh(input: Date | string | number): string {
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return String(input);
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(d);
}

export function formatMOOXDateEn(input: Date | string | number): string {
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return String(input);
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Shanghai",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}
