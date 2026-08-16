/**
 * MOOX verification display normalization.
 *
 * Display-only rules: database rows, immutable forecasts and verification history
 * are never rewritten by this module. HYPE and ASTEROID are deliberately separate.
 */

const SYMBOL_ALIASES: Record<string, string> = {
  BTC: "BTC",
  BTCUSD: "BTC",
  BTCUSDT: "BTC",
  XBTUSD: "BTC",
  ETH: "ETH",
  ETHUSD: "ETH",
  ETHUSDT: "ETH",
  SPX: "SPX",
  "^GSPC": "SPX",
  NDX: "NDX",
  "^NDX": "NDX",
  QQQ: "QQQ",
  HSTECH: "HSTECH",
  "HSTECH.HK": "HSTECH",
  SHCOMP: "SHCOMP",
  SSEC: "SHCOMP",
  "000001": "SHCOMP",
  "000001.SS": "SHCOMP",
  GOLD: "GOLD",
  GLD: "GOLD",
  "GC=F": "GOLD",
  XAUUSD: "GOLD",
  SILVER: "SILVER",
  SLV: "SILVER",
  "SI=F": "SILVER",
  XAGUSD: "SILVER",
  WTI: "WTI",
  CL: "WTI",
  "CL=F": "WTI",
  WTIUSD: "WTI",
  HYPE: "HYPE",
  HYPEUSDT: "HYPE",
  ASTEROID: "ASTEROID",
};

const ZH_NAMES: Record<string, string> = {
  BTC: "比特币",
  ETH: "以太坊",
  SPX: "标普500",
  NDX: "纳斯达克100",
  QQQ: "纳指100 ETF",
  HSTECH: "恒生科技",
  SHCOMP: "上证指数",
  GOLD: "国际金价",
  SILVER: "国际银价",
  WTI: "WTI原油",
  HYPE: "HYPE",
  ASTEROID: "太空狗",
};

const EN_NAMES: Record<string, string> = {
  BTC: "Bitcoin",
  ETH: "Ether",
  SPX: "S&P 500",
  NDX: "Nasdaq 100",
  QQQ: "Nasdaq 100 ETF",
  HSTECH: "Hang Seng TECH",
  SHCOMP: "Shanghai Composite",
  GOLD: "International gold",
  SILVER: "International silver",
  WTI: "WTI crude oil",
  HYPE: "HYPE",
  ASTEROID: "ASTEROID",
};

const ZH_ENUMS: Array<[RegExp, string]> = [
  [/\bDOWN_THEN_UP\b/g, "先跌后涨"],
  [/\bUP_THEN_DOWN\b/g, "先涨后跌"],
  [/\bSPIKE_THEN_FADE\b/g, "冲高回落"],
  [/\bDIP_THEN_RECOVER\b/g, "探底回升"],
  [/\bSIDEWAYS_UP\b/g, "震荡上涨"],
  [/\bSIDEWAYS_DOWN\b/g, "震荡下跌"],
  [/\bPARTIAL_HIT\b/g, "部分命中"],
  [/\bFULL_HIT\b/g, "完全命中"],
  [/\bUNVERIFIABLE\b/g, "不可验证"],
  [/\bEXCLUDED\b/g, "不计入统计"],
  [/\bPENDING\b/g, "待验证"],
  [/\bLOCKED\b/g, "已锁定"],
  [/\bSIDEWAYS\b/g, "震荡"],
  [/\bMISS\b/g, "未命中"],
  [/\bUP\b/g, "上涨"],
  [/\bDOWN\b/g, "下跌"],
];

const EN_ENUMS: Array<[RegExp, string]> = [
  [/\bDOWN_THEN_UP\b/g, "Down then up"],
  [/\bUP_THEN_DOWN\b/g, "Up then down"],
  [/\bSPIKE_THEN_FADE\b/g, "Spike then fade"],
  [/\bDIP_THEN_RECOVER\b/g, "Rebound from lows"],
  [/\bSIDEWAYS_UP\b/g, "Range, bias up"],
  [/\bSIDEWAYS_DOWN\b/g, "Range, bias down"],
  [/\bPARTIAL_HIT\b/g, "Partial hit"],
  [/\bFULL_HIT\b/g, "Full hit"],
  [/\bUNVERIFIABLE\b/g, "Unverifiable"],
  [/\bEXCLUDED\b/g, "Excluded"],
  [/\bPENDING\b/g, "Pending"],
  [/\bLOCKED\b/g, "Locked"],
  [/\bSIDEWAYS\b/g, "Range"],
  [/\bMISS\b/g, "Miss"],
  [/\bUP\b/g, "Up"],
  [/\bDOWN\b/g, "Down"],
];

export function canonicalVerificationSymbol(raw: string | null | undefined): string {
  const normalized = String(raw ?? "").trim().toUpperCase();
  return SYMBOL_ALIASES[normalized] ?? normalized;
}

export function verificationAssetName(
  rawSymbol: string | null | undefined,
  rawName: string | null | undefined,
  en: boolean
): string {
  const symbol = canonicalVerificationSymbol(rawSymbol);
  const mapped = (en ? EN_NAMES : ZH_NAMES)[symbol];
  if (mapped) return mapped;
  const name = String(rawName ?? "").trim();
  if (!name || name.toUpperCase() === String(rawSymbol ?? "").trim().toUpperCase()) return symbol;
  return name;
}

export function verificationAssetLabel(
  rawSymbol: string | null | undefined,
  rawName: string | null | undefined,
  en: boolean
): string {
  return verificationAssetName(rawSymbol, rawName, en);
}

export function humanizeVerificationText(value: string | null | undefined, en: boolean): string {
  if (value == null) return "";
  let text = String(value);
  for (const [pattern, replacement] of en ? EN_ENUMS : ZH_ENUMS) {
    text = text.replace(pattern, replacement);
  }
  return text;
}

export type PendingVerificationDisplayItem = {
  forecastDate: string;
  symbol: string;
  lockedAt: string;
};

/**
 * One public current row per canonical asset + target date. Latest lock wins.
 * Older versions remain untouched in storage/history and are only hidden from
 * the current pending queue.
 */
export function dedupePendingVerificationItems<T extends PendingVerificationDisplayItem>(items: T[]): T[] {
  const sorted = [...items].sort((a, b) => {
    const lock = Date.parse(b.lockedAt) - Date.parse(a.lockedAt);
    if (Number.isFinite(lock) && lock !== 0) return lock;
    return String(b.lockedAt).localeCompare(String(a.lockedAt));
  });
  const seen = new Set<string>();
  const result: T[] = [];
  for (const item of sorted) {
    const key = `${canonicalVerificationSymbol(item.symbol)}::${item.forecastDate}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}

// Regression markers: these assets must never be merged.
export const HYPE_VERIFICATION_SYMBOL = canonicalVerificationSymbol("HYPE");
export const ASTEROID_VERIFICATION_SYMBOL = canonicalVerificationSymbol("ASTEROID");
