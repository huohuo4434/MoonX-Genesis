/**
 * MOOX V7.20.10.2 — 2026-10 flash-crash risk prior.
 *
 * This is a locked medium-horizon risk prior derived from the user's pre-event
 * Liu-Yao research record. It MUST NOT rewrite the formal daily direction.
 * It may only change risk display, confirmation strictness and position sizing.
 */

export type October2026FlashCrashState =
  | "INACTIVE"
  | "PREWATCH"
  | "WATCH"
  | "ELEVATED"
  | "HIGH_ALERT"
  | "REALIZING"
  | "POST_WINDOW";

export type October2026FlashCrashSensitivity =
  | "DIRECT_US_RISK"
  | "HIGH_BETA_TRANSMISSION"
  | "MACRO_TRANSMISSION"
  | "SECONDARY_TRANSMISSION";

export type October2026FlashCrashSignals = {
  qimenBearish?: boolean;
  liuyaoRiskStrong?: boolean;
  h4Bearish?: boolean;
  m30Bearish?: boolean;
  m5SellSignal?: boolean;
  marketStress?: boolean;
};

export type October2026FlashCrashRisk = {
  state: October2026FlashCrashState;
  stateLabelZh: string;
  windowLabelZh: string;
  summaryZh: string;
  lockedAt: string;
  source: "LOCKED_LIUYAO_PRIOR";
  triggerCount: number;
};

export type October2026AssetRisk = October2026FlashCrashRisk & {
  symbol: string;
  sensitivity: October2026FlashCrashSensitivity;
  sensitivityLabelZh: string;
  longRiskScale: number;
  noteZh: string;
};

const LOCKED_AT = "2026-08-20T06:43:00+08:00";
const PREWATCH_START = "2026-08-20";
const WATCH_START = "2026-09-01";
const OCTOBER_START = "2026-10-01";
const COLD_DEW_START = "2026-10-08";
const WINDOW_END = "2026-10-31";
const POST_END = "2026-11-07";

const DIRECT_US = new Set([
  "SPX", "NDX", "SPY", "QQQ", "MU", "GOOGL", "GOOG", "SNDK", "MSFT", "NVDA", "AMD", "AVGO",
]);
const HIGH_BETA = new Set(["BTC", "ETH", "HYPE", "HSTECH"]);
const MACRO = new Set(["WTI", "CL", "GOLD", "XAU", "XAUT", "SILVER", "XAG"]);

function beijingDateKey(input: Date): string {
  const shifted = new Date(input.getTime() + 8 * 60 * 60_000);
  const year = shifted.getUTCFullYear();
  const month = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const day = String(shifted.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function triggerCount(signals?: October2026FlashCrashSignals): number {
  if (!signals) return 0;
  return [
    signals.qimenBearish,
    signals.liuyaoRiskStrong,
    signals.h4Bearish,
    signals.m30Bearish,
    signals.m5SellSignal,
    signals.marketStress,
  ].filter(Boolean).length;
}

export function getOctober2026FlashCrashRisk(
  asOf = new Date(),
  signals?: October2026FlashCrashSignals,
): October2026FlashCrashRisk {
  const dateKey = beijingDateKey(asOf);
  const hits = triggerCount(signals);
  let state: October2026FlashCrashState = "INACTIVE";

  if (dateKey >= PREWATCH_START && dateKey < WATCH_START) state = "PREWATCH";
  else if (dateKey >= WATCH_START && dateKey < OCTOBER_START) state = "WATCH";
  else if (dateKey >= OCTOBER_START && dateKey < COLD_DEW_START) state = "ELEVATED";
  else if (dateKey >= COLD_DEW_START && dateKey <= WINDOW_END) state = hits >= 4 ? "REALIZING" : "HIGH_ALERT";
  else if (dateKey > WINDOW_END && dateKey <= POST_END) state = "POST_WINDOW";

  const labels: Record<October2026FlashCrashState, string> = {
    INACTIVE: "未启用",
    PREWATCH: "未触发",
    WATCH: "升温",
    ELEVATED: "升温",
    HIGH_ALERT: "高警戒",
    REALIZING: "正在兑现",
    POST_WINDOW: "窗口后验证",
  };
  const summaries: Record<October2026FlashCrashState, string> = {
    INACTIVE: "当前不在2026年10月风险先验观察窗口。",
    PREWATCH: "10月中周期风险先验已锁定，当前仅提前观察，不改变任何日度正式方向。",
    WATCH: "9月属于次级风险观察期；提高对美股高Beta、AI、半导体与风险资产联动的敏感度。",
    ELEVATED: "已进入10月风险月，追涨与杠杆需要更谨慎；正式方向仍由奇门等既定研究流程产生。",
    HIGH_ALERT: "寒露后至10月下旬为重点闪崩/快速风险释放窗口；只强化风控，不事后改写方向。",
    REALIZING: "中周期风险先验与至少四项实时风险条件共振，按“正在兑现”处理并主动降低新增多头暴露。",
    POST_WINDOW: "主要时间窗已结束，进入事后验证；不得重新起卦覆盖已锁定结论。",
  };

  return {
    state,
    stateLabelZh: labels[state],
    windowLabelZh: "2026年10月 · 寒露后至10月下旬重点",
    summaryZh: summaries[state],
    lockedAt: LOCKED_AT,
    source: "LOCKED_LIUYAO_PRIOR",
    triggerCount: hits,
  };
}

export function normalizeFlashCrashRiskSymbol(symbol: string): string {
  const normalized = String(symbol || "").trim().toUpperCase();
  return normalized.endsWith("USDT") ? normalized.slice(0, -4) : normalized;
}

export function classifyOctober2026FlashCrashSensitivity(
  symbol: string,
  market?: string | null,
): October2026FlashCrashSensitivity {
  const normalized = normalizeFlashCrashRiskSymbol(symbol);
  const marketText = String(market || "").toUpperCase();
  if (DIRECT_US.has(normalized) || /NASDAQ|NYSE|US|AMEX/.test(marketText)) return "DIRECT_US_RISK";
  if (HIGH_BETA.has(normalized)) return "HIGH_BETA_TRANSMISSION";
  if (MACRO.has(normalized)) return "MACRO_TRANSMISSION";
  return "SECONDARY_TRANSMISSION";
}

function scaleFor(
  state: October2026FlashCrashState,
  sensitivity: October2026FlashCrashSensitivity,
): number {
  if (state === "INACTIVE" || state === "PREWATCH" || state === "POST_WINDOW") return 1;
  const table: Record<
    Exclude<October2026FlashCrashState, "INACTIVE" | "PREWATCH" | "POST_WINDOW">,
    Record<October2026FlashCrashSensitivity, number>
  > = {
    WATCH: {
      DIRECT_US_RISK: 0.9,
      HIGH_BETA_TRANSMISSION: 0.92,
      MACRO_TRANSMISSION: 1,
      SECONDARY_TRANSMISSION: 1,
    },
    ELEVATED: {
      DIRECT_US_RISK: 0.75,
      HIGH_BETA_TRANSMISSION: 0.8,
      MACRO_TRANSMISSION: 0.9,
      SECONDARY_TRANSMISSION: 0.9,
    },
    HIGH_ALERT: {
      DIRECT_US_RISK: 0.55,
      HIGH_BETA_TRANSMISSION: 0.65,
      MACRO_TRANSMISSION: 0.8,
      SECONDARY_TRANSMISSION: 0.85,
    },
    REALIZING: {
      DIRECT_US_RISK: 0.35,
      HIGH_BETA_TRANSMISSION: 0.45,
      MACRO_TRANSMISSION: 0.7,
      SECONDARY_TRANSMISSION: 0.75,
    },
  };
  return table[state][sensitivity];
}

export function getOctober2026AssetRisk(
  symbol: string,
  asOf = new Date(),
  market?: string | null,
  signals?: October2026FlashCrashSignals,
): October2026AssetRisk {
  const base = getOctober2026FlashCrashRisk(asOf, signals);
  const sensitivity = classifyOctober2026FlashCrashSensitivity(symbol, market);
  const sensitivityLabels: Record<October2026FlashCrashSensitivity, string> = {
    DIRECT_US_RISK: "美股直接高敏感",
    HIGH_BETA_TRANSMISSION: "高Beta传导敏感",
    MACRO_TRANSMISSION: "宏观传导观察",
    SECONDARY_TRANSMISSION: "次级传导观察",
  };
  const normalized = normalizeFlashCrashRiskSymbol(symbol);
  const noteBySensitivity: Record<October2026FlashCrashSensitivity, string> = {
    DIRECT_US_RISK: "10月风险窗对美股指数与高Beta个股直接生效；不改方向，只收紧追涨、仓位和新增多头风险。",
    HIGH_BETA_TRANSMISSION: "与美股风险偏好高度联动时可能出现快速传导；不得因相关性替代本资产自己的正式方向与5分钟执行确认。",
    MACRO_TRANSMISSION: "可能通过美元、流动性和风险偏好传导，但可出现避险或供需分化，不能机械按美股同方向处理。",
    SECONDARY_TRANSMISSION: "作为跨市场风险观察项，只有本市场自身方向/结构也转弱时才提高执行警戒。",
  };
  return {
    ...base,
    symbol: normalized,
    sensitivity,
    sensitivityLabelZh: sensitivityLabels[sensitivity],
    longRiskScale: scaleFor(base.state, sensitivity),
    noteZh: noteBySensitivity[sensitivity],
  };
}

export function applyOctober2026LongRiskScale(
  currentRiskScale: number,
  direction: "LONG" | "SHORT" | "NEUTRAL",
  assetRisk: October2026AssetRisk,
): number {
  if (direction !== "LONG") return Math.max(0, Math.min(1, currentRiskScale));
  return Math.max(0, Math.min(1, Math.min(currentRiskScale, assetRisk.longRiskScale)));
}
