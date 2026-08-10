/**
 * Weekly Alpha eligibility policy.
 * A-shares cannot be shorted in the product's intended execution workflow, therefore
 * bearish A-share calls never occupy Top 5 opportunity slots. Extreme bearish consensus
 * is surfaced only as a risk/avoidance note.
 */
export type WeeklyAlphaResonanceLike = {
  slug: string;
  direction: "BULLISH" | "BEARISH" | "UNCLEAR";
  hasWeeklyVote: boolean;
  sameDirectionPeriods: number;
  score?: number;
};

export const A_SHARE_WEEKLY_ALPHA_SLUGS = new Set([
  "cxmt",
  "kingsoft-office",
  "lexin-medical",
  "lian-tech",
  "ganfeng-lithium",
]);

export function isAShareWeeklyAlphaSlug(slug: string): boolean {
  return A_SHARE_WEEKLY_ALPHA_SLUGS.has(slug);
}

/** A-share Top 5: target-week vote must exist and at least one higher horizon must align bullish. */
export function isAShareTop5Eligible(signal: WeeklyAlphaResonanceLike | null | undefined): boolean {
  if (!signal || !isAShareWeeklyAlphaSlug(signal.slug)) return Boolean(signal);
  return signal.direction === "BULLISH" && signal.hasWeeklyVote && signal.sameDirectionPeriods >= 2;
}

/** Extreme bearish A-share: target-week bearish plus at least two additional same-direction horizons. */
export function isAShareExtremeBearishRiskNote(signal: WeeklyAlphaResonanceLike | null | undefined): boolean {
  if (!signal || !isAShareWeeklyAlphaSlug(signal.slug)) return false;
  return signal.direction === "BEARISH" && signal.hasWeeklyVote && signal.sameDirectionPeriods >= 3;
}

export function filterWeeklyAlphaOpportunitySignals<T extends WeeklyAlphaResonanceLike>(signals: T[]): T[] {
  return signals.filter((signal) => !isAShareWeeklyAlphaSlug(signal.slug) || isAShareTop5Eligible(signal));
}
