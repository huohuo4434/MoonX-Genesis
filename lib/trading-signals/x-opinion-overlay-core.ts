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
};

function normalizeProbabilities(up: number, flat: number, down: number) {
  const a = Math.max(5, up);
  const b = Math.max(5, flat);
  const c = Math.max(5, down);
  const total = a + b + c;
  const nUp = Math.round(a / total * 100);
  const nFlat = Math.round(b / total * 100);
  return { up: nUp, flat: nFlat, down: 100 - nUp - nFlat };
}

/** Pure overlay: approved external views may adjust scenarios, never direction. */
export function applyApprovedXOverlayToGeneratedDaily(
  record: GeneratedDailyForecastRecord,
  overlay: ApprovedXForecastOverlay | null,
): GeneratedDailyForecastRecord {
  if (!overlay || overlay.approvedCount <= 0) return record;
  const shift = overlay.probabilityShiftPct;
  const probs = normalizeProbabilities(
    record.upProbability + shift,
    record.sidewaysProbability,
    record.downProbability - shift,
  );
  const directionLabel = overlay.direction === "LONG" ? "偏多" : overlay.direction === "SHORT" ? "偏空" : "中性";
  const evidence = `管理员批准X观点：${overlay.approvedCount}条，合并方向${directionLabel}，情景权重修订${shift >= 0 ? "+" : ""}${shift}个百分点；只调整概率与风险，不覆盖MOOX正式方向。`;
  const displayEvidence = overlay.displaySummaries.length ? `批准展示的外部观点：${overlay.displaySummaries.join("；")}` : "";
  return {
    ...record,
    upProbability: probs.up,
    sidewaysProbability: probs.flat,
    downProbability: probs.down,
    newsEvidence: [record.newsEvidence, evidence, displayEvidence].filter(Boolean).join("；"),
    revisionReason: [record.revisionReason, evidence].filter(Boolean).join("；"),
  };
}
