import type { VibeEvidenceSnapshot } from "@/types/vibe-evidence";

export const VIBE_HORIZON_BASE_WEIGHTS = {
  daily: 10,
  weekly: 20,
  monthly: 25,
} as const;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function effectiveVibeWeight(
  snapshot: Pick<VibeEvidenceSnapshot, "completeness" | "freshness">,
  horizon: keyof typeof VIBE_HORIZON_BASE_WEIGHTS
): number {
  const base = VIBE_HORIZON_BASE_WEIGHTS[horizon];
  const completeness = clamp(snapshot.completeness, 0, 100) / 100;
  const freshness = clamp(snapshot.freshness, 0, 100) / 100;
  return Math.round(base * completeness * freshness);
}
