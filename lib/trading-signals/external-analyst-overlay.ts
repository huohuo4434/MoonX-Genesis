// MOOX_EXTERNAL_ANALYST_V1
import type { ExternalAnalystOverlay } from "@/types/external-analyst";
import type {
  ThreeHorizonCondition,
  ThreeHorizonDirection,
  ThreeHorizonStrategyType,
} from "@/types/three-horizon-strategy";

type EvaluationLike = {
  direction: ThreeHorizonDirection;
  confidence: number;
  forecastScore: number;
  conditions: ThreeHorizonCondition[];
  currentPrice: number | null;
  entryPrice: number | null;
  stopLoss: number | null;
  target1: number | null;
  target2: number | null;
  ready: boolean;
  raw: Record<string, unknown>;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function rr(direction: ThreeHorizonDirection, entry: number, stop: number, target: number): number {
  const risk = Math.abs(entry - stop);
  if (risk <= 0) return 0;
  const reward = direction === "SHORT" ? entry - target : target - entry;
  return reward > 0 ? reward / risk : 0;
}

function nearestBelow(levels: number[], price: number): number | null {
  const rows = levels.filter((value) => value > 0 && value < price).sort((a, b) => b - a);
  return rows[0] ?? null;
}

function nearestAbove(levels: number[], price: number): number | null {
  const rows = levels.filter((value) => value > price).sort((a, b) => a - b);
  return rows[0] ?? null;
}

function secondBelow(levels: number[], price: number): number | null {
  const rows = levels.filter((value) => value > 0 && value < price).sort((a, b) => b - a);
  return rows[1] ?? null;
}

function secondAbove(levels: number[], price: number): number | null {
  const rows = levels.filter((value) => value > price).sort((a, b) => a - b);
  return rows[1] ?? null;
}

function aligned(
  primary: ThreeHorizonDirection,
  technical: ThreeHorizonDirection,
  external: ThreeHorizonDirection
): boolean {
  if (external === "NEUTRAL") return true;
  if (primary !== "NEUTRAL") return external === primary;
  return technical !== "NEUTRAL" && external === technical;
}

function sourceLabel(overlay: ExternalAnalystOverlay): string {
  return overlay.sourceLabels.join(" / ") || "外部技术分析";
}

export function applyExternalAnalystOverlay<T extends EvaluationLike>(input: {
  evaluation: T;
  overlay: ExternalAnalystOverlay | null;
  strategyType: ThreeHorizonStrategyType;
  primaryForecastDirection: ThreeHorizonDirection;
}): T {
  const { evaluation, overlay, strategyType, primaryForecastDirection } = input;
  if (!overlay || !evaluation.entryPrice || evaluation.direction === "NEUTRAL") return evaluation;

  const isAligned = aligned(primaryForecastDirection, evaluation.direction, overlay.direction);
  const source = sourceLabel(overlay);
  const directionText = overlay.direction === "LONG" ? "偏多" : overlay.direction === "SHORT" ? "偏空" : "条件式/中性";
  const policyText = primaryForecastDirection === "NEUTRAL"
    ? "当前卦象未给出单边方向，外部观点只能提供点位，不能单独触发交易。"
    : `六爻主方向为${primaryForecastDirection === "LONG" ? "多" : "空"}；外部观点不得反向改写。`;

  const condition: ThreeHorizonCondition = {
    key: "external_analyst",
    label: `外部技术点位参考（${source}）`,
    met: isAligned,
    value: `${source}近期观点${directionText}。${policyText}${overlay.timeWindows.length ? ` 时间窗口：${overlay.timeWindows.join("、")}。` : ""}`,
    weight: 0,
  };

  const baseRaw = {
    ...evaluation.raw,
    externalAnalyst: {
      sourceLabels: overlay.sourceLabels,
      sourceUrls: overlay.sourceUrls,
      summaries: overlay.summaries,
      direction: overlay.direction,
      confidence: overlay.confidence,
      supportLevels: overlay.supportLevels,
      resistanceLevels: overlay.resistanceLevels,
      targetLevels: overlay.targetLevels,
      invalidationLevels: overlay.invalidationLevels,
      timeWindows: overlay.timeWindows,
      newestPostedAt: overlay.newestPostedAt,
      primaryForecastDirection,
      applied: false,
      rule: "六爻周度/月度方向优先；外部技术观点仅辅助入场、止盈、止损和时间窗口，不得独立反转方向。",
    },
  };

  if (!isAligned) {
    return {
      ...evaluation,
      confidence: clamp(evaluation.confidence - 3, 0, 100),
      conditions: [...evaluation.conditions.filter((row) => row.key !== "external_analyst"), condition],
      raw: baseRaw,
    };
  }

  const entry = evaluation.entryPrice;
  const bufferPct = strategyType === "INTRADAY" ? 0.15 : strategyType === "SWING" ? 0.35 : 0.6;
  const maxStopPct = strategyType === "INTRADAY" ? 3 : strategyType === "SWING" ? 6 : 10;
  const supports = Array.from(new Set([...overlay.supportLevels, ...overlay.invalidationLevels])).sort((a, b) => a - b);
  const resistances = Array.from(new Set([...overlay.resistanceLevels, ...overlay.targetLevels])).sort((a, b) => a - b);

  let stopLoss = evaluation.stopLoss;
  let target1 = evaluation.target1;
  let target2 = evaluation.target2;
  const original = { stopLoss, target1, target2 };

  if (evaluation.direction === "LONG") {
    const support = nearestBelow(supports, entry);
    if (support) {
      const candidate = support * (1 - bufferPct / 100);
      const distancePct = (entry - candidate) / entry * 100;
      if (candidate > 0 && candidate < entry && distancePct <= maxStopPct) {
        stopLoss = stopLoss == null ? candidate : Math.min(stopLoss, candidate);
      }
    }
    const first = nearestAbove(resistances, entry);
    const second = secondAbove(resistances, entry);
    if (first) target1 = target1 == null ? first : Math.min(target1, first);
    if (second) target2 = target2 == null ? second : Math.max(target1 ?? entry, Math.min(target2, second));
    else if (first && target2 == null) target2 = first;
  } else {
    const resistance = nearestAbove(resistances, entry);
    if (resistance) {
      const candidate = resistance * (1 + bufferPct / 100);
      const distancePct = (candidate - entry) / entry * 100;
      if (candidate > entry && distancePct <= maxStopPct) {
        stopLoss = stopLoss == null ? candidate : Math.max(stopLoss, candidate);
      }
    }
    const first = nearestBelow(supports, entry);
    const second = secondBelow(supports, entry);
    if (first) target1 = target1 == null ? first : Math.max(target1, first);
    if (second) target2 = target2 == null ? second : Math.min(target1 ?? entry, Math.max(target2, second));
    else if (first && target2 == null) target2 = first;
  }

  const validStop = stopLoss != null && (evaluation.direction === "LONG" ? stopLoss < entry : stopLoss > entry);
  const validTarget1 = target1 != null && (evaluation.direction === "LONG" ? target1 > entry : target1 < entry);
  const validTarget2 = target2 != null && (evaluation.direction === "LONG" ? target2 > entry : target2 < entry);
  const rewardRisk = validStop && validTarget2 ? rr(evaluation.direction, entry, stopLoss as number, target2 as number) : 0;
  const applied = Boolean(validStop && validTarget1 && validTarget2 && rewardRisk >= 1.2);

  const externalRaw = baseRaw.externalAnalyst as Record<string, unknown>;
  const raw = {
    ...baseRaw,
    externalAnalyst: {
      ...externalRaw,
      applied,
      originalLevels: original,
      adjustedLevels: applied ? { stopLoss, target1, target2, rewardRisk } : original,
      rejection: applied ? null : "外部点位会导致结构无效或TP2盈亏比低于1:1.2，已保留系统原计划。",
    },
  };

  return {
    ...evaluation,
    confidence: clamp(evaluation.confidence + (overlay.direction === "NEUTRAL" ? 1 : 4), 0, 100),
    stopLoss: applied ? stopLoss : evaluation.stopLoss,
    target1: applied ? target1 : evaluation.target1,
    target2: applied ? target2 : evaluation.target2,
    conditions: [...evaluation.conditions.filter((row) => row.key !== "external_analyst"), condition],
    raw,
  };
}
