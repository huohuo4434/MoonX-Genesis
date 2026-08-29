export type ShadowVariantId =
  | "METAPHYSICS_PRIMARY"
  | "METAPHYSICS_USER_BLEND"
  | "WITH_EXTERNAL_CONDITIONS"
  | "WITH_EXTERNAL_AND_CHAN";

export const ANALYST_FUSION_SHADOW_VARIANTS: Array<{
  id: ShadowVariantId;
  label: string;
  description: string;
  authority: "RESEARCH_ONLY";
  tradingEligible: false;
}> = [
  { id: "METAPHYSICS_PRIMARY", label: "A 组", description: "易老师正式玄学方向", authority: "RESEARCH_ONLY", tradingEligible: false },
  { id: "METAPHYSICS_USER_BLEND", label: "B 组", description: "易老师方向＋用户玄学补充", authority: "RESEARCH_ONLY", tradingEligible: false },
  { id: "WITH_EXTERNAL_CONDITIONS", label: "C 组", description: "B 组＋博主宏观、风险与确认条件", authority: "RESEARCH_ONLY", tradingEligible: false },
  { id: "WITH_EXTERNAL_AND_CHAN", label: "D 组", description: "C 组＋缠论结构与执行点位", authority: "RESEARCH_ONLY", tradingEligible: false },
];

export type ShadowVariantSample = {
  id: string;
  variant: ShadowVariantId;
  market: string;
  horizon: string;
  regime: string;
  lockedAt: string;
  applicableStart: string;
  result: "FULL_HIT" | "PARTIAL_HIT" | "MISS" | "UNVERIFIABLE";
  adverseExcursionPct: number | null;
};

export function evaluateShadowVariant(samples: ShadowVariantSample[]) {
  const unique = new Map<string, ShadowVariantSample>();
  for (const sample of samples) {
    if (sample.result === "UNVERIFIABLE") continue;
    if (!Number.isFinite(Date.parse(sample.lockedAt))) continue;
    const periodStart = Date.parse(`${sample.applicableStart}T00:00:00.000Z`);
    if (!Number.isFinite(periodStart) || Date.parse(sample.lockedAt) >= periodStart) continue;
    const key = [sample.id, sample.market, sample.horizon, sample.regime].join(":");
    if (!unique.has(key)) unique.set(key, sample);
  }
  const eligible = Array.from(unique.values());
  const points = eligible.reduce((total, sample) => total + (sample.result === "FULL_HIT" ? 1 : sample.result === "PARTIAL_HIT" ? 0.5 : 0), 0);
  const adverse = eligible.flatMap((sample) => sample.adverseExcursionPct === null ? [] : [sample.adverseExcursionPct]);
  const regimes = new Set(eligible.map((sample) => sample.regime));
  return {
    eligibleSamples: eligible.length,
    hitRatePct: eligible.length ? Math.round(points / eligible.length * 1000) / 10 : null,
    averageAdverseExcursionPct: adverse.length ? Math.round(adverse.reduce((sum, value) => sum + value, 0) / adverse.length * 100) / 100 : null,
    regimeCount: regimes.size,
    authority: "RESEARCH_ONLY" as const,
    tradingEligible: false as const,
  };
}

export function determineShadowPromotion(input: {
  candidate: ReturnType<typeof evaluateShadowVariant>;
  baseline: ReturnType<typeof evaluateShadowVariant>;
}) {
  const candidateRate = input.candidate.hitRatePct;
  const baselineRate = input.baseline.hitRatePct;
  const improvement = candidateRate === null || baselineRate === null ? null : Math.round((candidateRate - baselineRate) * 10) / 10;
  const adverseNotWorse = input.candidate.averageAdverseExcursionPct !== null && input.baseline.averageAdverseExcursionPct !== null
    ? input.candidate.averageAdverseExcursionPct <= input.baseline.averageAdverseExcursionPct
    : false;
  if (input.candidate.eligibleSamples < 10) return { state: "OBSERVE_ONLY" as const, improvementPctPoints: improvement };
  if (input.candidate.eligibleSamples < 20) return { state: "RISK_ONLY" as const, improvementPctPoints: improvement };
  if (input.candidate.eligibleSamples >= 30 && input.candidate.regimeCount >= 2 && improvement !== null && improvement >= 8 && adverseNotWorse) {
    return { state: "WEIGHT_REVIEW_CANDIDATE" as const, improvementPctPoints: improvement };
  }
  if (improvement !== null && improvement >= 8 && adverseNotWorse) return { state: "CONFIRMATION_CANDIDATE" as const, improvementPctPoints: improvement };
  return { state: "KEEP_SHADOW" as const, improvementPctPoints: improvement };
}
