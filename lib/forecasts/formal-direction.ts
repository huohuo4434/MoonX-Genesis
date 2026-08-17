/**
 * Formal daily display directions. Banned vague phrases must be normalized.
 */
export const ALLOWED_FORMAL_DIRECTIONS = [
  "上涨",
  "下跌",
  "震荡",
  "震荡上涨",
  "震荡下跌",
  "先涨后跌",
  "先跌后涨",
  "冲高回落",
  "探底回升",
] as const;

export type FormalDirection = (typeof ALLOWED_FORMAL_DIRECTIONS)[number];

export const OFFICIAL_DIRECTION_VALUES = [
  "上涨",
  "震荡上涨",
  "先跌后涨",
  "震荡",
  "先涨后跌",
  "震荡下跌",
  "下跌",
] as const;

export type OfficialDirection = (typeof OFFICIAL_DIRECTION_VALUES)[number];

const OFFICIAL_SET = new Set<string>(OFFICIAL_DIRECTION_VALUES);

/** Public/member official vocabulary; legacy path labels remain readable internally. */
export function normalizeOfficialDirection(raw: string | null | undefined): OfficialDirection {
  const text = String(raw ?? "").trim();
  if (!text) return "震荡";
  if (OFFICIAL_SET.has(text)) return text as OfficialDirection;
  if (/先跌后涨|探底回升|先抑后扬|先压后修复|低位修复/.test(text)) return "先跌后涨";
  if (/先涨后跌|冲高回落|先扬后抑|高开低走|回落兑现/.test(text)) return "先涨后跌";
  if (/震荡上涨|震荡偏多|震荡偏涨|偏强|修复上行|修复偏多|偏强确认|高波动上涨/.test(text)) return "震荡上涨";
  if (/震荡下跌|震荡偏空|震荡偏跌|偏弱|回踩观察|承压|修复失败|高波动回落/.test(text)) return "震荡下跌";
  if (/整固|盘整|横盘|区间整理|区间震荡|宽幅震荡|中性|观察|观望|等待确认/.test(text)) return "震荡";
  if (/上涨|看涨|看多|强势上行|明显走强/.test(text)) return "上涨";
  if (/下跌|看跌|看空|明显转弱|单边向下/.test(text)) return "下跌";
  return "震荡";
}

const ALLOWED = new Set<string>(ALLOWED_FORMAL_DIRECTIONS);

const BANNED_TO_ALLOWED: Record<string, FormalDirection> = {
  偏多: "震荡上涨",
  偏空: "震荡下跌",
  震荡偏多: "震荡上涨",
  震荡偏空: "震荡下跌",
  前高后低: "先涨后跌",
  先抑后扬: "先跌后涨",
  修复偏多: "震荡上涨",
  高位惯性: "冲高回落",
  高波动回落: "冲高回落",
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
  震荡偏涨: "震荡上涨",
  震荡偏跌: "震荡下跌",
  高波动上涨: "震荡上涨",
  先涨后震荡: "先涨后跌",
  宽幅震荡: "震荡",
  冲高回落后修复: "震荡",
};

export function normalizeFormalDirection(raw: string | null | undefined): FormalDirection {
  const text = String(raw ?? "").trim();
  if (!text) return "震荡";
  if (ALLOWED.has(text)) return text as FormalDirection;
  if (BANNED_TO_ALLOWED[text]) return BANNED_TO_ALLOWED[text]!;
  for (const [bad, good] of Object.entries(BANNED_TO_ALLOWED)) {
    if (text.includes(bad)) return good;
  }
  if (/先跌后涨|探底回升/.test(text)) return text.includes("探底") ? "探底回升" : "先跌后涨";
  if (/先涨后跌|冲高回落/.test(text)) return text.includes("冲高") ? "冲高回落" : "先涨后跌";
  if (/震荡上涨|震荡偏涨|震荡偏多/.test(text)) return "震荡上涨";
  if (/震荡下跌|震荡偏跌|震荡偏空/.test(text)) return "震荡下跌";
  if (/上涨|看涨|偏多/.test(text)) return "上涨";
  if (/下跌|看跌|偏空/.test(text)) return "下跌";
  return "震荡";
}

/** @deprecated use normalizeFormalDirection */
export function normalizeTomorrowDirection(raw: string | null | undefined): string {
  return normalizeFormalDirection(raw);
}

export function displayMarketCode(symbol: string): string {
  const code = symbol.trim().toUpperCase();
  if (code === "000001.SS" || code === "SSEC" || code === "SSE") return "SHCOMP";
  if (code === "^GSPC") return "SPX";
  if (code === "CL=F" || code === "CL") return "WTI";
  if (
    code === "GLD" ||
    code === "GOLD" ||
    code === "XAU" ||
    code === "XAUUSD" ||
    code === "GC=F"
  ) {
    return "GOLD";
  }
  return symbol;
}
