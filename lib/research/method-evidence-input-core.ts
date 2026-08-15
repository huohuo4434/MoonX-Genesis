export type MethodEvidenceKind =
  | "LIUYAO"
  | "QIMEN"
  | "FUNDAMENTAL"
  | "EXTERNAL_ANALYST"
  | "TECHNICAL"
  | "MACRO"
  | "NEWS";

export type MethodEvidenceDirection = "UP" | "DOWN" | "NEUTRAL" | "TIMING_ONLY";

export type StructuredMethodEvidence = {
  kind: MethodEvidenceKind;
  sourceLabel: string;
  sourcePublishedAt: string;
  applicableStart: string;
  applicableEnd: string;
  direction: MethodEvidenceDirection;
  confirmation: string;
  invalidation: string;
  primaryHexagram?: string;
  mutualHexagram?: string;
  changedHexagram?: string;
  movingLines?: number[];
  isStaticHexagram?: boolean;
  qimenChart?: string;
  qimenChartReviewed?: boolean;
  qimenWindowStart?: string;
  qimenWindowEnd?: string;
};

export type MethodEvidenceReadiness = {
  state: "FORWARD_LOCKED" | "WAIT";
  hardWaitReasons: string[];
  executionAuthority: "RESEARCH_ONLY";
  tradingEligible: false;
};

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

function validDateKey(value: string): boolean {
  if (!DATE_KEY.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function validInstant(value: string): boolean {
  return Boolean(value) && Number.isFinite(new Date(value).getTime());
}

function beijingDateKey(value: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Hong_Kong", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function assessMethodEvidence(
  evidence: StructuredMethodEvidence,
  capturedNow: Date
): MethodEvidenceReadiness {
  const reasons: string[] = [];
  if (!["LIUYAO", "QIMEN", "FUNDAMENTAL", "EXTERNAL_ANALYST", "TECHNICAL", "MACRO", "NEWS"].includes(evidence.kind)) {
    reasons.push("METHOD_KIND_INVALID");
  }
  if (!["UP", "DOWN", "NEUTRAL", "TIMING_ONLY"].includes(evidence.direction)) reasons.push("DIRECTION_INVALID");
  if (!evidence.sourceLabel.trim()) reasons.push("SOURCE_REQUIRED");
  if (!validInstant(evidence.sourcePublishedAt)) reasons.push("SOURCE_PUBLISHED_AT_REQUIRED");
  else if (new Date(evidence.sourcePublishedAt).getTime() > capturedNow.getTime()) reasons.push("SOURCE_FROM_FUTURE");
  if (!validDateKey(evidence.applicableStart) || !validDateKey(evidence.applicableEnd)) reasons.push("PERIOD_INVALID");
  else {
    if (evidence.applicableStart > evidence.applicableEnd) reasons.push("PERIOD_REVERSED");
    if (beijingDateKey(capturedNow) >= evidence.applicableStart) reasons.push("NOT_LOCKED_BEFORE_PERIOD");
  }
  if (!evidence.confirmation.trim()) reasons.push("CONFIRMATION_REQUIRED");
  if (!evidence.invalidation.trim()) reasons.push("INVALIDATION_REQUIRED");

  if (evidence.kind === "LIUYAO") {
    if (!evidence.primaryHexagram?.trim()) reasons.push("LIUYAO_PRIMARY_REQUIRED");
    if (!evidence.mutualHexagram?.trim()) reasons.push("LIUYAO_MUTUAL_REQUIRED");
    if (typeof evidence.isStaticHexagram !== "boolean") reasons.push("LIUYAO_STATIC_DECLARATION_REQUIRED");
    if (!Array.isArray(evidence.movingLines)) reasons.push("LIUYAO_MOVING_LINES_REQUIRED");
    else if (evidence.movingLines.some((line) => !Number.isInteger(line) || line < 1 || line > 6)) {
      reasons.push("LIUYAO_MOVING_LINES_INVALID");
    }
    const changed = evidence.changedHexagram?.trim() ?? "";
    if (evidence.isStaticHexagram === true) {
      if ((evidence.movingLines?.length ?? 0) !== 0) reasons.push("LIUYAO_STATIC_WITH_MOVING_LINES");
      if (!/^(无变卦|無變卦|静卦|靜卦)(（静卦）|\(静卦\))?$/.test(changed)) reasons.push("LIUYAO_STATIC_CHANGED_INVALID");
    } else if (evidence.isStaticHexagram === false) {
      if (!changed || /无变卦|無變卦|静卦|靜卦/.test(changed)) reasons.push("LIUYAO_CHANGED_REQUIRED");
      if (Array.isArray(evidence.movingLines) && evidence.movingLines.length < 1) reasons.push("LIUYAO_DYNAMIC_MOVING_LINES_REQUIRED");
    }
  }

  if (evidence.kind === "QIMEN") {
    const chart = evidence.qimenChart?.trim() ?? "";
    const requiredChartParts = ["九宫", "值符", "值使", "九星", "八门", "八神", "天盘", "地盘"];
    if (!chart || requiredChartParts.some((part) => !chart.includes(part))) reasons.push("QIMEN_COMPLETE_CHART_REQUIRED");
    if (evidence.qimenChartReviewed !== true) reasons.push("QIMEN_CHART_REVIEW_REQUIRED");
    if (!validInstant(evidence.qimenWindowStart ?? "") || !validInstant(evidence.qimenWindowEnd ?? "")) {
      reasons.push("QIMEN_WINDOW_REQUIRED");
    } else if (new Date(evidence.qimenWindowStart!).getTime() >= new Date(evidence.qimenWindowEnd!).getTime()) {
      reasons.push("QIMEN_WINDOW_INVALID");
    } else {
      const windowStart = new Date(evidence.qimenWindowStart!);
      const windowEnd = new Date(evidence.qimenWindowEnd!);
      if (windowStart.getTime() <= capturedNow.getTime()) reasons.push("QIMEN_WINDOW_NOT_FORWARD");
      const startKey = beijingDateKey(windowStart);
      const endKey = beijingDateKey(windowEnd);
      if (startKey < evidence.applicableStart || endKey > evidence.applicableEnd) reasons.push("QIMEN_WINDOW_OUTSIDE_PERIOD");
    }
    if (evidence.direction !== "TIMING_ONLY") reasons.push("QIMEN_TIMING_ONLY");
  }

  return {
    state: reasons.length ? "WAIT" : "FORWARD_LOCKED",
    hardWaitReasons: Array.from(new Set(reasons)),
    executionAuthority: "RESEARCH_ONLY",
    tradingEligible: false,
  };
}

export type ForwardMethodSample = {
  sourceId: string;
  market: string;
  horizon: string;
  regime: string;
  sourcePublishedAt: string;
  lockedAt: string;
  forecastStart: string;
  scoreEligible: boolean;
  result: "FULL_HIT" | "PARTIAL_HIT" | "MISS" | "UNVERIFIABLE";
};

export function deriveForwardValidatedWeight(input: {
  baseWeightPct: number;
  maxWeightPct: number;
  samples: ForwardMethodSample[];
  scope: { market: string; horizon: string; regime: string };
  minimumSamples?: number;
}) {
  const minimumSamples = input.minimumSamples ?? 10;
  const eligibleBySource = new Map<string, ForwardMethodSample>();
  for (const sample of input.samples.filter(
    (sample) =>
      sample.scoreEligible &&
      sample.market === input.scope.market &&
      sample.horizon === input.scope.horizon &&
      sample.regime === input.scope.regime &&
      sample.result !== "UNVERIFIABLE" &&
      validInstant(sample.sourcePublishedAt) &&
      validInstant(sample.lockedAt) &&
      validDateKey(sample.forecastStart) &&
      new Date(sample.sourcePublishedAt).getTime() < new Date(`${sample.forecastStart}T00:00:00.000Z`).getTime() &&
      new Date(sample.lockedAt).getTime() < new Date(`${sample.forecastStart}T00:00:00.000Z`).getTime()
  )) {
    if (!eligibleBySource.has(sample.sourceId)) eligibleBySource.set(sample.sourceId, sample);
  }
  const eligible = Array.from(eligibleBySource.values());
  const points = eligible.reduce(
    (sum, sample) => sum + (sample.result === "FULL_HIT" ? 1 : sample.result === "PARTIAL_HIT" ? 0.5 : 0),
    0
  );
  const weightedHitRate = eligible.length ? points / eligible.length : null;
  const base = Math.max(0, input.baseWeightPct);
  const max = Math.max(base, input.maxWeightPct);
  const mayAdjust = input.scope.regime !== "UNCLASSIFIED" && eligible.length >= minimumSamples && weightedHitRate !== null;
  const effectiveWeightPct =
    !mayAdjust
      ? base
      : Math.round(Math.min(max, Math.max(0, base * (0.5 + weightedHitRate))) * 10) / 10;
  return {
    eligibleSamples: eligible.length,
    minimumSamples,
    weightedHitRate: weightedHitRate === null ? null : Math.round(weightedHitRate * 1000) / 10,
    effectiveWeightPct,
    adjustmentState: mayAdjust ? "FORWARD_ADJUSTED" as const : "BASE_WEIGHT" as const,
  };
}

export function resolveMethodDirectionCommittee(
  inputs: Array<{ readiness: MethodEvidenceReadiness; direction: MethodEvidenceDirection; weightPct: number }>
) {
  const eligible = inputs.filter((item) => item.readiness.state === "FORWARD_LOCKED" && item.direction !== "TIMING_ONLY");
  const hasUp = eligible.some((item) => item.direction === "UP" && item.weightPct > 0);
  const hasDown = eligible.some((item) => item.direction === "DOWN" && item.weightPct > 0);
  if (!eligible.length) return { action: "WAIT" as const, direction: "NEUTRAL" as const, reason: "NO_FORWARD_EVIDENCE" };
  if (hasUp && hasDown) return { action: "WAIT" as const, direction: "NEUTRAL" as const, reason: "EVIDENCE_CONFLICT" };
  if (hasUp) return { action: "RESEARCH_CANDIDATE" as const, direction: "UP" as const, reason: "ALIGNED_FORWARD_EVIDENCE" };
  if (hasDown) return { action: "RESEARCH_CANDIDATE" as const, direction: "DOWN" as const, reason: "ALIGNED_FORWARD_EVIDENCE" };
  return { action: "WAIT" as const, direction: "NEUTRAL" as const, reason: "NEUTRAL_EVIDENCE" };
}
