import type { DailyForecast } from "@/types/daily-forecast";

export type ConsensusStar = 1 | 2 | 3 | 4 | 5;

export type ConsensusConfidence = {
  stars: ConsensusStar;
  score: number;
  label: string;
  activeModules: number;
  note: string;
};

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function hasConcreteLevels(input: Pick<DailyForecast, "supportLevels" | "resistanceLevels" | "confirmation" | "invalidation">): boolean {
  return Boolean(
    input.supportLevels?.some((s) => /\d/.test(s)) &&
      input.resistanceLevels?.some((s) => /\d/.test(s)) &&
      input.confirmation &&
      input.invalidation
  );
}

function moduleCount(f: DailyForecast): number {
  let count = 1; // 六爻 / 周度方向 is the base module.
  if (hasConcreteLevels(f)) count += 1;
  if ((f.evidenceRecordIds?.length ?? 0) > 0 || /周期|周度|周内|本周/.test(`${f.summary} ${(f.expectedPath ?? []).join(" ")}`)) count += 1;
  if (/先涨后跌|先跌后涨|冲高回落|探底回升|时间窗口|择时|周初|周中|周后/.test(`${f.directionLabel ?? ""} ${f.summary} ${(f.expectedPath ?? []).join(" ")}`)) count += 1;
  if ((f.catalysts?.length ?? 0) > 0 || (f.risks?.length ?? 0) > 0) count += 1;
  return Math.min(5, count);
}

function starForScore(score: number, modules: number): ConsensusStar {
  if (score >= 82 && modules >= 4) return 5;
  if (score >= 68 && modules >= 3) return 4;
  if (score >= 52 && modules >= 2) return 3;
  if (score >= 35) return 2;
  return 1;
}

function labelForStars(stars: ConsensusStar): string {
  if (stars === 5) return "强共识";
  if (stars === 4) return "较强共识";
  if (stars === 3) return "中等共识";
  if (stars === 2) return "分歧较大";
  return "依据有限";
}

export function deriveForecastConsensus(f: DailyForecast): ConsensusConfidence {
  if (f.consensusStars && f.consensusScore != null) {
    return {
      stars: f.consensusStars,
      score: f.consensusScore,
      label: f.consensusLabel ?? labelForStars(f.consensusStars),
      activeModules: f.consensusModuleCount ?? moduleCount(f),
      note: f.consensusNote ?? "星级表示不同研究方法的方向一致程度。",
    };
  }

  const probabilities = f.probabilities ?? {
    up: f.direction === "看涨" ? f.confidence : Math.round((100 - f.confidence) / 2),
    flat: f.direction === "中性" ? f.confidence : Math.round((100 - f.confidence) / 2),
    down: f.direction === "看跌" ? f.confidence : Math.round((100 - f.confidence) / 2),
  };
  const sorted = [probabilities.up, probabilities.flat, probabilities.down].sort((a, b) => b - a);
  const probabilityLead = (sorted[0] ?? 0) - (sorted[1] ?? 0);
  const modules = moduleCount(f);
  const technicalBonus = hasConcreteLevels(f) ? 9 : 0;
  const moduleBonus = Math.max(0, modules - 1) * 6;
  const score = Math.round(clamp(28 + probabilityLead * 1.6 + technicalBonus + moduleBonus, 15, 95));
  const stars = starForScore(score, modules);
  return {
    stars,
    score,
    label: labelForStars(stars),
    activeModules: modules,
    note:
      stars >= 4
        ? "多项有效方法方向较一致。"
        : stars === 3
          ? "主方向存在，但仍有需要验证的分歧。"
          : "方法间分歧较大或有效依据数量偏少。",
  };
}

export function starsText(stars: ConsensusStar): string {
  return `${"★".repeat(stars)}${"☆".repeat(5 - stars)}`;
}

export function consensusStarsFromInputs(input: {
  confidence: number;
  frameworkCount: number;
  hasTechnical: boolean;
  pathDefined: boolean;
  /** Share of active directional methods that agree with the final direction. */
  agreementRatio?: number;
}): ConsensusConfidence {
  const modules = clamp(
    input.frameworkCount + (input.hasTechnical ? 1 : 0) + (input.pathDefined ? 1 : 0),
    1,
    5
  );
  const agreement = clamp(
    input.agreementRatio ?? Math.max(0.35, Math.min(0.9, input.confidence / 100)),
    0,
    1
  );
  const score = Math.round(
    clamp(
      15 + agreement * 60 + Math.max(0, modules - 1) * 5 + (input.hasTechnical ? 5 : 0),
      15,
      95
    )
  );
  const stars = starForScore(score, modules);
  return {
    stars,
    score,
    label: labelForStars(stars),
    activeModules: modules,
    note: "星级在发布时锁定，用于后续按共识等级分类验证。",
  };
}
