import type { GeneratedDailyForecastRecord } from "@/lib/weekly-source/types";
import type { XOpinionDirection } from "@/types/x-opinion-matrix";

export type ApprovedXForecastOverlay = {
  symbol: string;
  direction: XOpinionDirection;
  approvedCount: number;
  totalWeightPct: number;
  probabilityShiftPct: number;
  summaries: string[];
  displaySummaries: string[];
  levels: number[];
  timeWindows: string[];
  displayAllowedCount: number;
  verifiedSourceCount: number;
  buildingSourceCount: number;
};

export type ApprovedXRelation = "ALIGNED" | "CONFLICT" | "NEUTRAL";

function officialSide(direction: string): XOpinionDirection {
  if (/先涨后跌|冲高回落|震荡下跌|下跌/u.test(direction)) return "SHORT";
  if (/先跌后涨|探底回升|震荡上涨|上涨/u.test(direction)) return "LONG";
  return "NEUTRAL";
}

function relationToOfficial(direction: string, overlay: XOpinionDirection): ApprovedXRelation {
  const official = officialSide(direction);
  if (official === "NEUTRAL" || overlay === "NEUTRAL") return "NEUTRAL";
  return official === overlay ? "ALIGNED" : "CONFLICT";
}

function normalizeProbabilities(up: number, flat: number, down: number) {
  const a = Math.max(5, up);
  const b = Math.max(5, flat);
  const c = Math.max(5, down);
  const total = a + b + c;
  const nUp = Math.round(a / total * 100);
  const nFlat = Math.round(b / total * 100);
  return { up: nUp, flat: nFlat, down: 100 - nUp - nFlat };
}

function preserveOfficialProbabilityLeader(
  direction: string,
  input: { up: number; flat: number; down: number },
): { up: number; flat: number; down: number } {
  const official = officialSide(direction);
  if (official === "NEUTRAL") return input;
  const result = { ...input };
  const leader = official === "LONG" ? "up" as const : "down" as const;
  const others = leader === "up" ? ["flat", "down"] as const : ["up", "flat"] as const;
  for (let guard = 0; guard < 100; guard += 1) {
    const donor = result[others[0]] >= result[others[1]] ? others[0] : others[1];
    if (result[leader] > result[donor] || result[donor] <= 5) break;
    result[leader] += 1;
    result[donor] -= 1;
  }
  return result;
}

/** Pure overlay: approved external views may adjust scenarios, never direction. */
export function applyApprovedXOverlayToGeneratedDaily(
  record: GeneratedDailyForecastRecord,
  overlay: ApprovedXForecastOverlay | null,
): GeneratedDailyForecastRecord {
  if (!overlay || overlay.approvedCount <= 0) return record;
  const shift = overlay.probabilityShiftPct;
  const relation = relationToOfficial(record.direction, overlay.direction);
  const probs = preserveOfficialProbabilityLeader(record.direction, normalizeProbabilities(
    record.upProbability + shift,
    record.sidewaysProbability,
    record.downProbability - shift,
  ));
  const directionLabel = overlay.direction === "LONG" ? "偏多" : overlay.direction === "SHORT" ? "偏空" : "中性";
  const appliedShift = overlay.direction === "LONG"
    ? probs.up - record.upProbability
    : overlay.direction === "SHORT"
      ? probs.down - record.downProbability
      : 0;
  const relationLabel = relation === "ALIGNED" ? "与MOOX同向" : relation === "CONFLICT" ? "与MOOX相反" : "方向未形成一致结论";
  const maturityLabel = overlay.verifiedSourceCount > 0
    ? `成熟验证源${overlay.verifiedSourceCount}个`
    : overlay.buildingSourceCount > 0
      ? `样本积累中${overlay.buildingSourceCount}个，暂不增加概率权重`
      : "普通外部研究源";
  const evidence = `外部验证层：${overlay.approvedCount}条，合并方向${directionLabel}，${relationLabel}；${maturityLabel}；情景权重实际修订${appliedShift >= 0 ? "+" : ""}${appliedShift}个百分点。只调整概率、风险和执行提醒，不覆盖MOOX正式方向。`;
  const displayEvidence = overlay.displaySummaries.length ? `批准展示的外部观点：${overlay.displaySummaries.join("；")}` : "";
  const relationRisk = relation === "CONFLICT" ? "一级外部验证与正式方向相反，降低执行信心并等待价格确认。" : "";
  return {
    ...record,
    upProbability: probs.up,
    sidewaysProbability: probs.flat,
    downProbability: probs.down,
    newsEvidence: [record.newsEvidence, evidence, displayEvidence].filter(Boolean).join("；"),
    revisionReason: [record.revisionReason, evidence].filter(Boolean).join("；"),
    risks: [...new Set([...(record.risks ?? []), relationRisk].filter(Boolean))],
  };
}
