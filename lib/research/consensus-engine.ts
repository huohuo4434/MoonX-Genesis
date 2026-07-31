/**
 * Deterministic MoonX Consensus Engine. No AI APIs, no randomness — pure
 * weighted arithmetic over curated `ResearchRecord`s. See Part 9 of the
 * V1.1 spec for the exact formula this implements.
 */
import type { LocalizedText } from "@/lib/i18n/config";
import type { ForecastWindow, ResearchDirection, ResearchFramework, ResearchRecord } from "@/types/research";

export const DIRECTION_VALUES: Record<ResearchDirection, number> = {
  "strong-bullish": 1.0,
  bullish: 0.75,
  "slightly-bullish": 0.35,
  neutral: 0,
  "slightly-bearish": -0.35,
  bearish: -0.75,
  "strong-bearish": -1.0,
  "insufficient-evidence": 0,
};

export const FRAMEWORK_WEIGHTS: Record<ResearchFramework, number> = {
  "oracle-six-yao": 1.0,
  qimen: 0.9,
  cycle: 0.9,
  gann: 0.8,
  harmonic: 0.8,
  chan: 0.8,
  "market-flow": 0.85,
  macro: 0.9,
  technical: 0.9,
  internal: 1.0,
};

export type ConsensusLabel = "bullish" | "slightly-bullish" | "neutral" | "slightly-bearish" | "bearish";

export interface FrameworkContribution {
  framework: ResearchFramework;
  weight: number;
  weightShare: number;
  recordCount: number;
}

export interface ConsensusResult {
  assetId: string;
  eligibleCount: number;
  insufficientEvidence: boolean;
  score: number | null;
  weightedDirection: number | null;
  label: ConsensusLabel | null;
  bullishWeightShare: number;
  neutralWeightShare: number;
  bearishWeightShare: number;
  frameworkContributions: FrameworkContribution[];
  supportingArguments: { text: LocalizedText; recordId: string }[];
  conflictingArguments: { text: LocalizedText; recordId: string }[];
  nextTurningWindow: (ForecastWindow & { recordId: string }) | null;
  keyVerificationItems: { text: LocalizedText; recordId: string }[];
  eligibleRecords: ResearchRecord[];
}

function labelForScore(score: number): ConsensusLabel {
  if (score >= 65) return "bullish";
  if (score >= 55) return "slightly-bullish";
  if (score >= 45) return "neutral";
  if (score >= 35) return "slightly-bearish";
  return "bearish";
}

/** Picks the earliest not-yet-elapsed turning window (or the earliest overall if all have passed). */
function pickNextTurningWindow(
  records: ResearchRecord[],
  now: Date
): (ForecastWindow & { recordId: string }) | null {
  const candidates: (ForecastWindow & { recordId: string })[] = [];
  for (const record of records) {
    for (const window of record.turningWindows ?? []) {
      candidates.push({ ...window, recordId: record.id });
    }
  }
  if (candidates.length === 0) return null;

  const withDate = candidates
    .map((w) => ({ w, ts: new Date(w.date ?? w.start ?? "").getTime() }))
    .filter((entry) => Number.isFinite(entry.ts))
    .sort((a, b) => a.ts - b.ts);

  if (withDate.length === 0) return candidates[0] ?? null;

  const upcoming = withDate.find((entry) => entry.ts >= now.getTime());
  return (upcoming ?? withDate[0])!.w;
}

/**
 * Computes the deterministic consensus score for a given asset from the
 * eligible (`consensusEligible: true`, non "insufficient-evidence") records
 * that reference it.
 */
export function computeConsensus(
  assetId: string,
  allRecords: ResearchRecord[],
  now: Date = new Date("2026-07-26")
): ConsensusResult {
  const nowKey = now.toISOString().slice(0, 10);
  const eligibleRecords = allRecords.filter((r) => {
    if (r.assetId !== assetId || !r.consensusEligible || r.direction === "insufficient-evidence") return false;
    if (r.forecastStart && nowKey < r.forecastStart) return false;
    if (r.forecastEnd && nowKey > r.forecastEnd) return false;
    if (r.expiresAt && now.getTime() >= new Date(r.expiresAt).getTime()) return false;
    return true;
  });

  if (eligibleRecords.length < 2) {
    return {
      assetId,
      eligibleCount: eligibleRecords.length,
      insufficientEvidence: true,
      score: null,
      weightedDirection: null,
      label: null,
      bullishWeightShare: 0,
      neutralWeightShare: 0,
      bearishWeightShare: 0,
      frameworkContributions: [],
      supportingArguments: [],
      conflictingArguments: [],
      nextTurningWindow: null,
      keyVerificationItems: [],
      eligibleRecords,
    };
  }

  let numerator = 0;
  let denominator = 0;
  let bullishWeight = 0;
  let neutralWeight = 0;
  let bearishWeight = 0;
  const frameworkWeightMap = new Map<ResearchFramework, { weight: number; count: number }>();

  for (const record of eligibleRecords) {
    const directionValue = DIRECTION_VALUES[record.direction];
    const frameworkWeight = FRAMEWORK_WEIGHTS[record.framework];
    const weight = record.editorialConfidence * frameworkWeight;

    numerator += directionValue * weight;
    denominator += weight;

    if (directionValue > 0) bullishWeight += weight;
    else if (directionValue < 0) bearishWeight += weight;
    else neutralWeight += weight;

    const existing = frameworkWeightMap.get(record.framework);
    frameworkWeightMap.set(record.framework, {
      weight: (existing?.weight ?? 0) + weight,
      count: (existing?.count ?? 0) + 1,
    });
  }

  const weightedDirection = denominator === 0 ? 0 : numerator / denominator;
  const score = Math.round(((weightedDirection + 1) / 2) * 100);
  const label = labelForScore(score);
  const totalWeight = bullishWeight + neutralWeight + bearishWeight || 1;

  const frameworkContributions: FrameworkContribution[] = Array.from(frameworkWeightMap.entries())
    .map(([framework, { weight, count }]) => ({
      framework,
      weight,
      weightShare: weight / totalWeight,
      recordCount: count,
    }))
    .sort((a, b) => b.weight - a.weight);

  const isFinalBullish = weightedDirection >= 0;
  const supportingArguments: { text: LocalizedText; recordId: string }[] = [];
  const conflictingArguments: { text: LocalizedText; recordId: string }[] = [];

  for (const record of eligibleRecords) {
    const directionValue = DIRECTION_VALUES[record.direction];
    const bucket = directionValue === 0 ? null : directionValue > 0 === isFinalBullish ? supportingArguments : conflictingArguments;
    const firstThesis = record.thesis[0];
    if (bucket && firstThesis) {
      bucket.push({ text: firstThesis, recordId: record.id });
    }
  }

  const keyVerificationItems: { text: LocalizedText; recordId: string }[] = [];
  for (const record of eligibleRecords) {
    for (const item of record.verificationChecklist ?? []) {
      keyVerificationItems.push({ text: item, recordId: record.id });
    }
  }

  return {
    assetId,
    eligibleCount: eligibleRecords.length,
    insufficientEvidence: false,
    score,
    weightedDirection,
    label,
    bullishWeightShare: bullishWeight / totalWeight,
    neutralWeightShare: neutralWeight / totalWeight,
    bearishWeightShare: bearishWeight / totalWeight,
    frameworkContributions,
    supportingArguments: supportingArguments.slice(0, 4),
    conflictingArguments: conflictingArguments.slice(0, 4),
    nextTurningWindow: pickNextTurningWindow(eligibleRecords, now),
    keyVerificationItems: keyVerificationItems.slice(0, 6),
    eligibleRecords,
  };
}

export function computeConsensusForAssets(
  assetIds: string[],
  allRecords: ResearchRecord[],
  now?: Date
): Record<string, ConsensusResult> {
  const result: Record<string, ConsensusResult> = {};
  for (const assetId of assetIds) {
    result[assetId] = computeConsensus(assetId, allRecords, now);
  }
  return result;
}
