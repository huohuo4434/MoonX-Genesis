// MOOX_EXTERNAL_ANALYST_V1_1
import type {
  ExternalAnalystParsedPost,
  ExternalAnalystRole,
  ExternalAnalystSource,
} from "@/types/external-analyst";
import type {
  ThreeHorizonDirection,
  ThreeHorizonStrategyType,
} from "@/types/three-horizon-strategy";

const SYMBOL_ALIASES: Array<[string, string[]]> = [
  ["BTCUSDT", ["$btc", "btc", "bitcoin", "比特币", "比特幣", "大饼"]],
  ["ETHUSDT", ["$eth", "eth", "ethereum", "ether", "以太坊", "以太幣"]],
  ["HYPEUSDT", ["$hype", "hype", "hyperliquid"]],
  ["MUUSDT", ["$mu", "mu", "micron", "美光", "存储", "存儲", "内存", "記憶體"]],
  ["QQQUSDT", ["$qqq", "qqq", "nasdaq", "ndx", "纳指", "納指", "纳斯达克", "納斯達克", "nq"]],
  ["XAUTUSDT", ["$xau", "xau", "xauusd", "gold", "黄金", "黃金"]],
  ["XAGUSDT", ["$xag", "xag", "xagusd", "silver", "白银", "白銀"]],
  ["GOOGLUSDT", ["$googl", "$goog", "googl", "goog", "google", "alphabet", "谷歌"]],
  ["CLUSDT", ["$cl", "cl", "wti", "crude", "原油", "石油"]],
  ["SPYUSDT", ["$spy", "$spx", "spy", "spx", "sp500", "s&p 500", "s&p500", "标普", "標普"]],
];

const LONG_WORDS = [
  "看多", "做多", "加仓多", "多单", "多头", "反弹", "上涨", "继续涨", "突破", "站稳",
  "新一轮上涨", "阶段性底部", "支撑有效", "向上", "回调结束", "buy", "long", "bullish",
];
const SHORT_WORDS = [
  "看空", "做空", "加仓空", "空单", "空头", "下跌", "继续跌", "跌破", "失守", "回落",
  "深度回调", "反弹结束", "向下", "sell", "short", "bearish",
];

const SUPPORT_WORDS = [
  "支撑", "守住", "不跌破", "不能跌破", "底部", "低点", "下沿", "回踩", "测试有效", "绿色江恩",
];
const RESISTANCE_WORDS = [
  "压力", "阻力", "承压", "上方", "关口", "突破", "站稳", "角度线", "压力区间",
];
const TARGET_WORDS = [
  "目标", "终点", "看到", "看至", "涨至", "跌至", "下一站", "后续关注", "上看", "下看",
];
const INVALIDATION_WORDS = [
  "失守", "跌破", "无法站上", "无法突破", "无效", "结束", "止损", "不能守住", "反弹结束",
];

function uniqueSorted(values: number[]): number[] {
  return Array.from(new Set(values.filter((value) => Number.isFinite(value) && value > 0)))
    .sort((a, b) => a - b);
}

function containsAny(text: string, words: string[]): boolean {
  return words.some((word) => text.includes(word));
}

function countWords(text: string, words: string[]): number {
  return words.reduce((sum, word) => sum + (text.includes(word) ? 1 : 0), 0);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function aliasMatches(text: string, alias: string): boolean {
  const normalizedAlias = alias.toLowerCase();
  if (!/^[a-z0-9]+$/.test(normalizedAlias)) {
    return text.includes(normalizedAlias);
  }
  // Plain tickers such as BTC, ETH, MU and QQQ must also work without a leading "$".
  // Alphanumeric boundaries avoid false positives inside longer usernames or words.
  const pattern = new RegExp(`(^|[^a-z0-9])${escapeRegExp(normalizedAlias)}($|[^a-z0-9])`, "i");
  return pattern.test(text);
}

function detectSymbols(text: string, source: ExternalAnalystSource): string[] {
  const normalized = text.toLowerCase();
  const symbols = new Set<string>();
  if (source !== "BTCKIK") {
    for (const [symbol, aliases] of SYMBOL_ALIASES) {
      if (aliases.some((alias) => aliasMatches(normalized, alias))) symbols.add(symbol);
    }
  }
  if (source === "BTCKIK") {
    const blocked = new Set([
      "USD", "USDT", "USDC", "BTC", "ETH", "SPX", "NDX", "QQQ", "SPY",
      "MU", "AMD", "NVDA", "GOOG", "GOOGL", "MSFT", "XAU", "XAG", "WTI", "DXY",
    ]);
    for (const match of text.matchAll(/\$([A-Za-z][A-Za-z0-9]{1,9})\b/g)) {
      const ticker = (match[1] ?? "").toUpperCase();
      if (!ticker || blocked.has(ticker)) continue;
      symbols.add(`${ticker}USDT`);
    }
  }
  return Array.from(symbols);
}

function normalizeLevel(raw: string, unit: string): number | null {
  const numeric = Number(raw.replace(/,/g, ""));
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  const multiplier = unit.toLowerCase() === "k" ? 1_000 : unit === "万" ? 10_000 : 1;
  const value = numeric * multiplier;
  return value > 0 && value < 1_000_000_000 ? value : null;
}

function looksLikeDate(text: string, start: number, end: number, value: number): boolean {
  const before = text.slice(Math.max(0, start - 6), start);
  const after = text.slice(end, Math.min(text.length, end + 8));
  if (/^[年月日号时分]/.test(after)) return true;
  // Treat separators as dates only for date-sized values. A market range such as
  // 66900-67300 must remain two price levels rather than being mistaken for a date.
  if (value <= 31 && (/[./-]\s*$/.test(before) || /^\s*[./-]/.test(after))) return true;
  if (value >= 1900 && value <= 2100 && /^\s*[./-]\s*\d{1,2}(?:\D|$)/.test(after)) return true;
  return false;
}

function extractTimeWindows(text: string): string[] {
  const rows = new Set<string>();
  const patterns = [
    /\d{1,2}[月./-]\d{1,2}(?:日|号)?\s*(?:至|到|[-~—])\s*\d{1,2}[月./-]?\d{0,2}(?:日|号)?/g,
    /\d{1,2}月底(?:至|到)?\d{1,2}月初/g,
    /(?:本周|下周|本月|下月|月底|月初|周末|周日|周线收盘)/g,
  ];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) rows.add(match[0]);
  }
  return Array.from(rows).slice(0, 8);
}

function inferDirection(text: string): ThreeHorizonDirection {
  const normalized = text.toLowerCase();
  const longScore = countWords(normalized, LONG_WORDS);
  const shortScore = countWords(normalized, SHORT_WORDS);
  if (longScore >= shortScore + 2) return "LONG";
  if (shortScore >= longScore + 2) return "SHORT";
  return "NEUTRAL";
}

function inferHorizon(source: ExternalAnalystSource, text: string): ThreeHorizonStrategyType {
  if (source === "HALILUYA") return "INTRADAY";
  if (containsAny(text, ["月线", "月度", "月底", "九月", "八月底", "中长期", "几个月"])) {
    return "POSITION";
  }
  return "SWING";
}

function classifyLevels(text: string): {
  supportLevels: number[];
  resistanceLevels: number[];
  targetLevels: number[];
  invalidationLevels: number[];
  keyLevels: number[];
} {
  const supportLevels: number[] = [];
  const resistanceLevels: number[] = [];
  const targetLevels: number[] = [];
  const invalidationLevels: number[] = [];
  const keyLevels: number[] = [];
  const pattern = /(?<![\d.])(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)(?:\s*)([kK万]?)/g;
  for (const match of text.matchAll(pattern)) {
    const raw = match[1] ?? "";
    const unit = match[2] ?? "";
    const start = match.index ?? 0;
    const end = start + match[0].length;
    const value = normalizeLevel(raw, unit);
    if (value == null) continue;
    if (looksLikeDate(text, start, end, value)) continue;
    const after = text.slice(end, end + 2);
    if (/^\s*%/.test(after)) continue;
    const context = text.slice(Math.max(0, start - 20), Math.min(text.length, end + 24)).toLowerCase();
    if (value >= 1900 && value <= 2100 && /20\d{2}/.test(raw) && containsAny(context, ["年", "财年"])) continue;
    keyLevels.push(value);
    if (containsAny(context, SUPPORT_WORDS)) supportLevels.push(value);
    if (containsAny(context, RESISTANCE_WORDS)) resistanceLevels.push(value);
    if (containsAny(context, TARGET_WORDS)) targetLevels.push(value);
    if (containsAny(context, INVALIDATION_WORDS)) invalidationLevels.push(value);
  }
  return {
    supportLevels: uniqueSorted(supportLevels),
    resistanceLevels: uniqueSorted(resistanceLevels),
    targetLevels: uniqueSorted(targetLevels),
    invalidationLevels: uniqueSorted(invalidationLevels),
    keyLevels: uniqueSorted(keyLevels),
  };
}

function sourceRole(source: ExternalAnalystSource): ExternalAnalystRole {
  if (source === "HALILUYA") return "PANIC_REVERSAL";
  if (source === "BTCKIK") return "ALTCOIN_DISCOVERY";
  if (source === "MAT78704") return "DIRECTION_CYCLE_RESONANCE";
  return "GANN_LEVEL_CYCLE";
}

export function parseExternalAnalystPost(input: {
  source: ExternalAnalystSource;
  username: string;
  postId: string;
  postUrl: string;
  postedAt: string;
  text: string;
}): ExternalAnalystParsedPost {
  const text = input.text.replace(/\s+/g, " ").trim();
  const levels = classifyLevels(text);
  const symbols = detectSymbols(text, input.source);
  const direction = inferDirection(text);
  const horizon = inferHorizon(input.source, text);
  const explicitLevelCount = levels.supportLevels.length + levels.resistanceLevels.length + levels.targetLevels.length;
  const timeWindows = extractTimeWindows(text);
  const gannContext = /江恩|角度线|周期|时间窗|支撑|压力|阻力|突破|跌破|站稳|失守/i.test(text);
  const researchEligible = input.source === "BTCTW0"
    ? symbols.length === 1 && gannContext && (explicitLevelCount > 0 || timeWindows.length > 0)
    : input.source === "MAT78704"
      ? symbols.length === 1 && direction !== "NEUTRAL"
      : input.source !== "BTCKIK";
  const researchRejection = researchEligible
    ? null
    : input.source === "BTCTW0"
      ? "缺少明确标的及江恩点位/周期上下文，仅留档不进入结构参考。"
      : input.source === "MAT78704"
        ? "缺少明确标的或明确方向，仅留档不进入共振参考。"
        : "山寨发现源仅进入雷达，不进入交易overlay。";
  const confidence = Math.max(35, Math.min(80,
    42 + explicitLevelCount * 4 + (direction === "NEUTRAL" ? 0 : 8) + (symbols.length === 1 ? 4 : 0)
  ));
  return {
    source: input.source,
    role: sourceRole(input.source),
    username: input.username,
    postId: input.postId,
    postUrl: input.postUrl,
    postedAt: input.postedAt,
    text,
    symbols,
    direction,
    horizon,
    ...levels,
    timeWindows,
    confidence,
    summary: text.length > 220 ? `${text.slice(0, 217)}...` : text,
    researchEligible,
    researchRejection,
  };
}

export function analystSourceFromUsername(username: string): ExternalAnalystSource | null {
  const normalized = username.replace(/^@/, "").toLowerCase();
  if (normalized === "haliluya8911") return "HALILUYA";
  if (normalized === "btctw0") return "BTCTW0";
  if (normalized === "btckik") return "BTCKIK";
  if (normalized === "mat78704") return "MAT78704";
  return null;
}
