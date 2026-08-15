import { DIRECTION_VALUES, FRAMEWORK_WEIGHTS } from "@/lib/research/consensus-engine";
import type { TeacherSourceBlendResult } from "@/lib/research/teacher-source-weights";
import type { ResearchFramework, ResearchRecord } from "@/types/research";

export type ResearchVoteLean = "UP" | "DOWN" | "FLAT" | "ABSTAIN";

export type WeightedResearchVote = {
  lean: ResearchVoteLean;
  weightedDirection: number;
  confidence: number;
  agreementRatio: number;
  frameworkCount: number;
  sourceIds: string[];
  primaryRecord: ResearchRecord | null;
};

type Group = {
  framework: ResearchFramework;
  weightedDirection: number;
  weight: number;
  records: ResearchRecord[];
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function leanFromScore(score: number): ResearchVoteLean {
  if (score >= 0.12) return "UP";
  if (score <= -0.12) return "DOWN";
  return "FLAT";
}

function frameworkWeight(framework: ResearchFramework): number {
  return FRAMEWORK_WEIGHTS[framework] ?? 1;
}

/** Single production gate for any research record that can affect direction. */
export function isResearchRecordEligibleForDirectionVote(record: ResearchRecord): boolean {
  if (record.consensusEligible !== true) return false;
  if (record.verificationEligibility === "provisional") return false;
  if (record.direction === "insufficient-evidence") return false;
  if (record.tags.includes("no-direction-score")) return false;
  return true;
}

/**
 * Groups records by framework so many records from one method cannot create
 * multiple artificial votes. When a teacher blend exists, all raw Liu-Yao
 * records are replaced by exactly one blended Liu-Yao vote.
 */
export function computeWeightedResearchVote(input: {
  records: ResearchRecord[];
  teacherBlend?: TeacherSourceBlendResult | null;
}): WeightedResearchVote {
  const groups = new Map<ResearchFramework, ResearchRecord[]>();
  const usable = input.records.filter((record) => {
    if (!isResearchRecordEligibleForDirectionVote(record)) return false;
    if (input.teacherBlend && (record.framework === "oracle-six-yao" || record.tags.includes("source:teacher02"))) {
      return false;
    }
    return true;
  });

  for (const record of usable) {
    const rows = groups.get(record.framework) ?? [];
    rows.push(record);
    groups.set(record.framework, rows);
  }

  const frameworkGroups: Group[] = [];
  for (const [framework, records] of groups) {
    let directionNumerator = 0;
    let confidenceTotal = 0;
    for (const record of records) {
      const confidence = Math.max(1, record.editorialConfidence);
      directionNumerator += DIRECTION_VALUES[record.direction] * confidence;
      confidenceTotal += confidence;
    }
    const averageConfidence = confidenceTotal / Math.max(1, records.length);
    frameworkGroups.push({
      framework,
      weightedDirection: confidenceTotal ? directionNumerator / confidenceTotal : 0,
      weight: averageConfidence * frameworkWeight(framework),
      records,
    });
  }

  if (input.teacherBlend) {
    frameworkGroups.push({
      framework: "oracle-six-yao",
      weightedDirection: input.teacherBlend.weightedDirection,
      weight: input.teacherBlend.confidence * frameworkWeight("oracle-six-yao"),
      records: [],
    });
  }

  if (!frameworkGroups.length) {
    return {
      lean: "ABSTAIN",
      weightedDirection: 0,
      confidence: 40,
      agreementRatio: 0,
      frameworkCount: 0,
      sourceIds: [],
      primaryRecord: null,
    };
  }

  const denominator = frameworkGroups.reduce((sum, group) => sum + group.weight, 0) || 1;
  const weightedDirection = frameworkGroups.reduce(
    (sum, group) => sum + group.weightedDirection * group.weight,
    0
  ) / denominator;
  const lean = leanFromScore(weightedDirection);
  const sign = lean === "UP" ? 1 : lean === "DOWN" ? -1 : 0;
  const agreeingWeight = frameworkGroups.reduce((sum, group) => {
    if (sign === 0) return sum + (Math.abs(group.weightedDirection) < 0.12 ? group.weight : 0);
    return sum + (group.weightedDirection * sign > 0 ? group.weight : 0);
  }, 0);
  const agreementRatio = agreeingWeight / denominator;
  const confidence = clamp(
    Math.round(46 + Math.abs(weightedDirection) * 18 + agreementRatio * 10),
    45,
    68
  );
  const rankedRecords = usable
    .slice()
    .sort((a, b) => b.editorialConfidence * frameworkWeight(b.framework) - a.editorialConfidence * frameworkWeight(a.framework));
  const sourceIds = [
    ...(input.teacherBlend?.sourceIds ?? []),
    ...rankedRecords.map((record) => record.id),
  ].filter((id, index, all) => all.indexOf(id) === index).slice(0, 8);

  return {
    lean,
    weightedDirection,
    confidence,
    agreementRatio,
    frameworkCount: frameworkGroups.length,
    sourceIds,
    primaryRecord: rankedRecords[0] ?? null,
  };
}
