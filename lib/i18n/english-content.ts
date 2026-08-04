import { ENGLISH_CONTENT_PENDING } from "@/lib/i18n/config";

const HAN_RE = /[\u3400-\u9fff\uf900-\ufaff]/;

export function containsHan(value: unknown): boolean {
  return typeof value === "string" && HAN_RE.test(value);
}

const DIRECTION_MAP: Record<string, string> = {
  "强势看涨": "Strongly bullish",
  "看涨": "Bullish",
  "略微看涨": "Slightly bullish",
  "上涨": "Higher",
  "震荡": "Range-bound",
  "震荡上涨": "Range-bound with an upside bias",
  "震荡偏多": "Range-bound with an upside bias",
  "震荡下跌": "Range-bound with a downside bias",
  "震荡偏空": "Range-bound with a downside bias",
  "中性": "Neutral",
  "观望": "Wait and observe",
  "暂无判断": "No formal view yet",
  "略微看跌": "Slightly bearish",
  "看跌": "Bearish",
  "下跌": "Lower",
  "强势看跌": "Strongly bearish",
  "先涨后跌": "Rally, then pull back",
  "冲高回落": "Rally, then fade",
  "先跌后涨": "Dip, then rebound",
  "探底回升": "Test support, then recover",
  "转折": "Turning point",
  "波动放大": "Higher volatility",
  "企稳": "Stabilization",
  "待确认": "Awaiting confirmation",
  "研究尚未完成": "Research in progress",
};

const SIGNAL_MAP: Record<string, string> = {
  "低": "Low",
  "中": "Medium",
  "中等": "Medium",
  "中高": "Medium-high",
  "高": "High",
  "极高": "Very high",
};

const STATUS_MAP: Record<string, string> = {
  "计划": "Plan only",
  "观察": "Monitoring",
  "等待做多": "Monitoring for a long setup",
  "等待做空": "Monitoring for a short setup",
  "准备做多": "Ready for long confirmation",
  "准备做空": "Ready for short confirmation",
  "中性观察": "Neutral monitoring",
  "已开启": "Enabled",
  "未开启": "Disabled",
  "已关闭": "Disabled",
  "已连接": "Connected",
  "未连接或延迟": "Disconnected or delayed",
  "已暂停": "Paused",
  "会员专享": "Members only",
  "资料待补充": "Research pending",
};

const ASSET_MAP: Record<string, string> = {
  "比特币": "Bitcoin",
  "以太坊": "Ether",
  "标普500指数": "S&P 500",
  "标普500": "S&P 500",
  "纳斯达克100指数": "Nasdaq 100",
  "纳斯达克100": "Nasdaq 100",
  "上证指数": "Shanghai Composite",
  "恒生科技指数": "Hang Seng TECH Index",
  "国际金价": "Gold",
  "黄金": "Gold",
  "白银": "Silver",
  "WTI原油": "WTI Crude Oil",
  "长鑫科技": "ChangXin Memory Technologies",
  "太空狗": "Asteroid",
  "美光": "Micron",
};

export function assetNameEn(value: string | null | undefined): string {
  if (!value) return "—";
  return ASSET_MAP[value.trim()] || safeEnglish(value);
}

export function directionEn(value: string | null | undefined): string {
  if (!value) return "—";
  return DIRECTION_MAP[value.trim()] || safeEnglish(value);
}

export function signalStrengthEn(value: string | null | undefined): string {
  if (!value) return "—";
  return SIGNAL_MAP[value.trim()] || safeEnglish(value);
}

export function statusEn(value: string | null | undefined): string {
  if (!value) return "—";
  return STATUS_MAP[value.trim()] || safeEnglish(value);
}

/** English pages never leak full Chinese paragraphs. Known labels are translated; unknown source text uses a locked-source notice. */
export function safeEnglish(value: string | null | undefined, fallback = ENGLISH_CONTENT_PENDING): string {
  if (!value) return "—";
  const trimmed = value.trim();
  if (!containsHan(trimmed)) return trimmed;
  return DIRECTION_MAP[trimmed] || SIGNAL_MAP[trimmed] || STATUS_MAP[trimmed] || fallback;
}

export function safeEnglishList(values: string[] | null | undefined): string[] {
  return (values ?? []).map((item) => safeEnglish(item));
}
