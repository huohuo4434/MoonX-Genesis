/**
 * Canonical Yahoo quote symbols for MoonX daily / weekly verification.
 * Hang Seng TECH Index must use HSTECH.HK (index ~thousands), never 3033.HK (ETF ~units).
 */

export const HSTECH_ASSET_ID = "HSTECH";
export const HSTECH_YAHOO_SYMBOL = "HSTECH.HK";
export const HSTECH_DISPLAY_SYMBOL = "^HSTECH";
export const HSTECH_DISPLAY_NAME = "恒生科技指数";

/** Minimum plausible close for Hang Seng TECH Index (guards ETF / scale errors). */
export const HSTECH_MIN_INDEX_LEVEL = 1000;

/** Max absolute day move before forcing manual review (indexes / ETFs). */
export const ABNORMAL_CLOSE_JUMP_RATIO = 0.25;

export function resolveCanonicalQuoteSymbol(symbol: string, quoteSymbol: string): string {
  const s = symbol.trim().toUpperCase();
  const q = quoteSymbol.trim();
  if (
    s === "HSTECH" ||
    q === "^HSTECH" ||
    q === "HSTECH" ||
    q === "3033.HK" ||
    q === "3032.HK" ||
    q.toUpperCase() === "HSTECH.HK"
  ) {
    return HSTECH_YAHOO_SYMBOL;
  }
  if (s === "SPX" || q === "SPX") return "^GSPC";
  if (s === "NDX" || q === "NDX") return "^NDX";
  if (s === "SSEC" || s === "SSE" || q === "000001.SS") return "000001.SS";
  if (s === "WTI" || q === "WTI" || q === "CL=F") return "CL=F";
  if (s === "BTC" || q === "BTC-USD") return "BTC-USD";
  if (
    s === "GLD" ||
    s === "GOLD" ||
    s === "XAU" ||
    s === "XAUUSD" ||
    q.toUpperCase() === "GLD" ||
    q.toUpperCase() === "GOLD" ||
    q.toUpperCase() === "XAU" ||
    q.toUpperCase() === "XAUUSD" ||
    q.toUpperCase() === "GC=F"
  ) {
    return "GC=F";
  }
  return q || quoteSymbol;
}

export function isHstechSymbol(symbol: string, quoteSymbol?: string): boolean {
  const s = symbol.trim().toUpperCase();
  const q = (quoteSymbol ?? "").trim().toUpperCase();
  return (
    s === "HSTECH" ||
    q === "HSTECH" ||
    q === "^HSTECH" ||
    q === "HSTECH.HK" ||
    q === "3033.HK" ||
    q === "3032.HK"
  );
}

/**
 * Returns a MANUAL_REVIEW reason when a quote fails index sanity checks.
 * Never invent prices — caller must discard the bar and mark review.
 */
export function quoteSanityFailure(input: {
  symbol: string;
  quoteSymbol: string;
  close: number;
  previousClose?: number;
  high?: number;
  low?: number;
}): string | null {
  if (!Number.isFinite(input.close) || input.close <= 0) {
    return "收盘价无效，需人工复核";
  }

  if (isHstechSymbol(input.symbol, input.quoteSymbol)) {
    const levels = [input.close, input.previousClose, input.high, input.low].filter(
      (n): n is number => typeof n === "number" && Number.isFinite(n)
    );
    if (levels.some((n) => n < HSTECH_MIN_INDEX_LEVEL)) {
      return "疑似标的或价格缩放错误";
    }
  }

  if (
    typeof input.previousClose === "number" &&
    Number.isFinite(input.previousClose) &&
    input.previousClose > 0
  ) {
    const jump = Math.abs(input.close - input.previousClose) / input.previousClose;
    if (jump > ABNORMAL_CLOSE_JUMP_RATIO) {
      return "收盘价相对前日偏差异常，需人工复核";
    }
  }

  return null;
}
