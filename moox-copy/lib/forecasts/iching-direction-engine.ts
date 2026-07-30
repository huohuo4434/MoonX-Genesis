/**
 * I Ching Direction Engine — direction / rhythm / risk only.
 * Never emits concrete prices, levels, or volume claims.
 */
import { normalizeFormalDirection, ALLOWED_FORMAL_DIRECTIONS } from "@/lib/forecasts/formal-direction";

export type IChingDirectionResult = {
  directionLabel: (typeof ALLOWED_FORMAL_DIRECTIONS)[number] | string;
  path: string[];
  riskStrength: "偏低" | "中等" | "偏高";
  timeWindowNote: string;
  evidence: string;
};

const BANNED_PRICE =
  /\d+\s*(美元|点|元|%)|支撑|压力|突破|跌破|放量|缩量|前高|前低|昨日|前一日|高点|低点/;

/**
 * Normalize an existing forecast's I Ching-facing fields.
 * Strips any accidental price language from path/summary used as direction evidence.
 */
export function buildIChingDirectionView(input: {
  directionLabel?: string | null;
  direction?: string | null;
  expectedPath?: string[];
  summary?: string;
  confidence?: number;
}): IChingDirectionResult {
  const raw = input.directionLabel || input.direction || "震荡";
  const directionLabel = normalizeFormalDirection(raw);
  const path = (input.expectedPath ?? [])
    .map((p) => p.trim())
    .filter((p) => p && !BANNED_PRICE.test(p))
    .slice(0, 4);
  const conf = input.confidence ?? 50;
  const riskStrength = conf >= 62 ? "偏高" : conf >= 48 ? "中等" : "偏低";
  const evidenceParts = [
    `方向判断：${directionLabel}`,
    path.length ? `运行节奏：${path.join(" → ")}` : null,
    `风险强弱：${riskStrength}`,
  ].filter(Boolean);
  return {
    directionLabel,
    path: path.length ? path : [`以${directionLabel}为主`],
    riskStrength,
    timeWindowNote: "下一实际交易日主路径",
    evidence: evidenceParts.join("；"),
  };
}

export function assertNoIChingPrices(text: string): string | null {
  if (BANNED_PRICE.test(text)) {
    return "六爻方向模块不得包含具体价格或突破/跌破表述";
  }
  return null;
}
