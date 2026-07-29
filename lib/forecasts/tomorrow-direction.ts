/**
 * Formal display directions for tomorrow / daily member forecasts.
 * Banned vague phrases are normalized away.
 */

const ALLOWED = new Set([
  "上涨",
  "下跌",
  "震荡",
  "震荡上涨",
  "震荡下跌",
  "先涨后跌",
  "先跌后涨",
  "冲高回落",
  "探底回升",
]);

const BANNED_TO_ALLOWED: Record<string, string> = {
  偏多: "震荡上涨",
  偏空: "震荡下跌",
  前高后低: "先涨后跌",
  先抑后扬: "先跌后涨",
  修复偏多: "震荡上涨",
  高位惯性: "冲高回落",
  观察: "震荡",
  等待确认: "震荡",
  观望: "震荡",
  看涨: "上涨",
  看跌: "下跌",
  略微看涨: "震荡上涨",
  略微看跌: "震荡下跌",
  强势看涨: "上涨",
  强势看跌: "下跌",
  中性: "震荡",
  区间震荡: "震荡",
};

export function normalizeTomorrowDirection(raw: string | null | undefined): string {
  const text = String(raw ?? "").trim();
  if (!text) return "震荡";
  if (ALLOWED.has(text)) return text;
  if (BANNED_TO_ALLOWED[text]) return BANNED_TO_ALLOWED[text]!;
  for (const [bad, good] of Object.entries(BANNED_TO_ALLOWED)) {
    if (text.includes(bad)) return good;
  }
  if (/先跌后涨|探底回升/.test(text)) return text.includes("探底") ? "探底回升" : "先跌后涨";
  if (/先涨后跌|冲高回落/.test(text)) return text.includes("冲高") ? "冲高回落" : "先涨后跌";
  if (/震荡上涨|震荡偏涨/.test(text)) return "震荡上涨";
  if (/震荡下跌|震荡偏跌/.test(text)) return "震荡下跌";
  if (/上涨|看涨|偏多/.test(text)) return "上涨";
  if (/下跌|看跌|偏空/.test(text)) return "下跌";
  return "震荡";
}

export function displayMarketCode(symbol: string): string {
  if (symbol === "000001.SS" || symbol === "SSEC") return "SHCOMP";
  if (symbol === "^GSPC") return "SPX";
  if (symbol === "CL=F" || symbol === "CL") return "WTI";
  if (symbol === "XAUUSD") return "GLD";
  return symbol;
}
