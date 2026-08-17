import { normalizeOfficialDirection } from "@/lib/forecasts/formal-direction";

export type MooxPrimaryDirection = "BULLISH" | "BEARISH" | "UNCLEAR";

/**
 * MOOX product doctrine:
 * - Metaphysical research determines the official direction.
 * - Technical analysis only helps with price levels, timing and risk control.
 * - Composite path labels still collapse to ONE end-state directional call.
 */
export function mooxPrimaryDirection(raw: string | null | undefined): MooxPrimaryDirection {
  const direction = normalizeOfficialDirection(raw);
  if (["上涨", "震荡上涨", "先跌后涨"].includes(direction)) return "BULLISH";
  if (["下跌", "震荡下跌", "先涨后跌"].includes(direction)) return "BEARISH";
  return "UNCLEAR";
}

export function mooxDirectionLabelZh(raw: string | null | undefined): "看涨" | "看跌" | "方向不明确" {
  const direction = mooxPrimaryDirection(raw);
  if (direction === "BULLISH") return "看涨";
  if (direction === "BEARISH") return "看跌";
  return "方向不明确";
}

export function mooxDirectionLabelEn(raw: string | null | undefined): "Bullish" | "Bearish" | "Unclear" {
  const direction = mooxPrimaryDirection(raw);
  if (direction === "BULLISH") return "Bullish";
  if (direction === "BEARISH") return "Bearish";
  return "Unclear";
}

export function mooxDirectionArrow(raw: string | null | undefined): "↑" | "↓" | "↔" {
  const direction = mooxPrimaryDirection(raw);
  if (direction === "BULLISH") return "↑";
  if (direction === "BEARISH") return "↓";
  return "↔";
}

export function mooxDirectionSentenceZh(raw: string | null | undefined): string {
  const label = mooxDirectionLabelZh(raw);
  if (label === "看涨") return "MOOX唯一方向：看涨。玄学负责定方向，技术分析只负责找点位，不用技术条件反向改成看跌。";
  if (label === "看跌") return "MOOX唯一方向：看跌。玄学负责定方向，技术分析只负责找点位，不用技术条件反向改成看涨。";
  return "MOOX方向：不明确。当前卦象没有形成足够一致的方向，不为了凑答案强行看涨或看跌。";
}

export function mooxDirectionSentenceEn(raw: string | null | undefined): string {
  const label = mooxDirectionLabelEn(raw);
  if (label === "Bullish") return "MOOX call: bullish. Metaphysical research sets direction; technical analysis is used only for levels and execution timing.";
  if (label === "Bearish") return "MOOX call: bearish. Metaphysical research sets direction; technical analysis is used only for levels and execution timing.";
  return "MOOX call: unclear. The metaphysical evidence is not aligned enough to force a bullish or bearish call.";
}

/**
 * For cross-horizon resonance ranking, long periods with a two-stage path are
 * mapped to the phase containing targetDate. Short weekly periods use the final
 * directional call because the card represents the whole weekly outcome.
 */
export function mooxDirectionAtDate(params: {
  direction: string | null | undefined;
  periodStart: string;
  periodEnd: string;
  targetDate: string;
}): MooxPrimaryDirection {
  const normalized = normalizeOfficialDirection(params.direction);
  const start = Date.parse(`${params.periodStart}T00:00:00Z`);
  const end = Date.parse(`${params.periodEnd}T00:00:00Z`);
  const target = Date.parse(`${params.targetDate}T00:00:00Z`);
  const days = Math.max(0, Math.round((end - start) / 86_400_000));

  if (days <= 10) return mooxPrimaryDirection(normalized);
  if (normalized === "先涨后跌") {
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return "BEARISH";
    return target <= start + (end - start) * 0.5 ? "BULLISH" : "BEARISH";
  }
  if (normalized === "先跌后涨") {
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return "BULLISH";
    return target <= start + (end - start) * 0.5 ? "BEARISH" : "BULLISH";
  }
  return mooxPrimaryDirection(normalized);
}


/**
 * Presentation-only cleanup for legacy technical notes. Locked forecast records are
 * preserved, but the UI must never present a technical trigger as permission to
 * reverse the metaphysical MOOX call.
 */
export function mooxTechnicalReferenceZh(
  raw: string | null | undefined,
  kind: "follow" | "risk" = "risk"
): string {
  const text = String(raw ?? "").trim();
  if (!text) return "";

  const suffix = kind === "follow"
    ? "作为技术跟随位置参考；不改变MOOX方向。"
    : "作为技术风控位置参考；不改变MOOX方向。";

  let cleaned = text
    .replace(/(?:，|,)?(?:则)?[^。；]*(?:看涨|看跌|看多|看空|多头|空头|上涨|下跌|震荡上涨|震荡下跌)[^。；]*(?:判断|逻辑|观点|方向)?[^。；]*(?:失效|降级|转空|转多|反转)[^。；]*/g, `，${suffix}`)
    .replace(/(?:，|,)?(?:则)?[^。；]*(?:判断|逻辑|观点|方向)[^。；]*(?:失效|改变|降级|转空|转多)[^。；]*/g, `，${suffix}`)
    .replace(/(?:，|,)?(?:则)?[^。；]*(?:提高|降低)[^。；]*(?:上涨|下跌|看涨|看跌|多头|空头)[^。；]*概率[^。；]*/g, `，${suffix}`)
    .replace(/(?:，|,)?(?:则)?[^。；]*(?:升级|转为|变成)[^。；]*(?:上行|下行|上涨|下跌|多头|空头|看涨|看跌)[^。；]*(?:结构|趋势|路径)?[^。；]*/g, `，${suffix}`)
    .replace(/，{2,}/g, "，");

  while (cleaned.includes(`${suffix}，${suffix}`)) {
    cleaned = cleaned.replace(`${suffix}，${suffix}`, suffix);
  }

  if (!cleaned.includes("不改变MOOX方向") && /(失效|转空|转多|反转|改变方向|降级)/.test(cleaned)) {
    cleaned = `${cleaned} ${suffix}`;
  }
  return cleaned;
}
