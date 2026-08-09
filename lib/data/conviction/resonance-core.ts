export type ResonanceDirection = "BULLISH" | "BEARISH" | "UNCLEAR";
export type ResonanceStrength = "极强共振" | "强共振" | "方向明确" | "单周期明确" | "方向冲突" | "资料不足";
export type ResonanceVote = {
  label: string;
  direction: ResonanceDirection;
  weight: number;
  horizon: "WEEK" | "MONTH" | "LONG";
};

export type ResonanceWindow = {
  start: string;
  end: string;
  labelZh: string;
};

export type ResonanceEvaluation = {
  direction: ResonanceDirection;
  strengthZh: ResonanceStrength;
  score: number;
  sameDirectionPeriods: number;
  directionalPeriods: number;
  hasWeeklyVote: boolean;
  evidenceZh: string[];
};

const DAY_MS = 86_400_000;

function parseDateKey(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error(`Invalid date key: ${value}`);
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function targetWeekWindow(asOfDate: string): ResonanceWindow {
  const date = parseDateKey(asOfDate);
  const weekday = date.getUTCDay(); // Sun 0, Mon 1 ... Sat 6
  let deltaToMonday: number;
  if (weekday === 0) deltaToMonday = 1;
  else if (weekday === 6) deltaToMonday = 2;
  else deltaToMonday = -(weekday - 1);
  const start = new Date(date.getTime() + deltaToMonday * DAY_MS);
  const end = new Date(start.getTime() + 6 * DAY_MS);
  const startKey = dateKey(start);
  const endKey = dateKey(end);
  return { start: startKey, end: endKey, labelZh: `${startKey.slice(5).replace("-", "/")}–${endKey.slice(5).replace("-", "/")}` };
}

export function targetWeekMidpoint(window: ResonanceWindow): string {
  const start = parseDateKey(window.start);
  return dateKey(new Date(start.getTime() + 3 * DAY_MS));
}

function evidenceLabel(direction: ResonanceDirection): string {
  if (direction === "BULLISH") return "看涨";
  if (direction === "BEARISH") return "看跌";
  return "不明确";
}

/**
 * Strict MOOX ranking doctrine:
 * 1) weekly + monthly agreement outranks single-horizon calls;
 * 2) any clear week/month disagreement is UNCLEAR, never averaged away;
 * 3) bullish and bearish evidence receive identical scoring;
 * 4) assets without a target-week vote can never be graded as strong resonance.
 */
export function evaluateResonanceVotes(votes: ResonanceVote[]): ResonanceEvaluation {
  const evidenceZh = votes.map((vote) => `${vote.label}：${evidenceLabel(vote.direction)}`);
  const directional = votes.filter((vote) => vote.direction !== "UNCLEAR");
  const weekVote = votes.find((vote) => vote.horizon === "WEEK");
  const monthVote = votes.find((vote) => vote.horizon === "MONTH");
  const hasWeeklyVote = Boolean(weekVote && weekVote.direction !== "UNCLEAR");

  if (!directional.length) {
    return {
      direction: "UNCLEAR",
      strengthZh: votes.length ? "方向冲突" : "资料不足",
      score: votes.length ? 100 : 0,
      sameDirectionPeriods: 0,
      directionalPeriods: 0,
      hasWeeklyVote,
      evidenceZh,
    };
  }

  if (
    weekVote && monthVote &&
    weekVote.direction !== "UNCLEAR" && monthVote.direction !== "UNCLEAR" &&
    weekVote.direction !== monthVote.direction
  ) {
    return {
      direction: "UNCLEAR",
      strengthZh: "方向冲突",
      score: 200 + directional.length,
      sameDirectionPeriods: Math.max(
        directional.filter((vote) => vote.direction === "BULLISH").length,
        directional.filter((vote) => vote.direction === "BEARISH").length
      ),
      directionalPeriods: directional.length,
      hasWeeklyVote,
      evidenceZh,
    };
  }

  const bullish = directional.filter((vote) => vote.direction === "BULLISH");
  const bearish = directional.filter((vote) => vote.direction === "BEARISH");
  const bullishWeight = bullish.reduce((sum, vote) => sum + vote.weight, 0);
  const bearishWeight = bearish.reduce((sum, vote) => sum + vote.weight, 0);

  let direction: ResonanceDirection = "UNCLEAR";
  if (bullishWeight > bearishWeight) direction = "BULLISH";
  else if (bearishWeight > bullishWeight) direction = "BEARISH";
  else if (weekVote?.direction && weekVote.direction !== "UNCLEAR") direction = weekVote.direction;

  if (direction === "UNCLEAR") {
    return {
      direction,
      strengthZh: "方向冲突",
      score: 200 + directional.length,
      sameDirectionPeriods: Math.max(bullish.length, bearish.length),
      directionalPeriods: directional.length,
      hasWeeklyVote,
      evidenceZh,
    };
  }

  const same = directional.filter((vote) => vote.direction === direction);
  const opposite = directional.filter((vote) => vote.direction !== direction);
  if (opposite.length) {
    return {
      direction: "UNCLEAR",
      strengthZh: "方向冲突",
      score: 200 + same.length,
      sameDirectionPeriods: same.length,
      directionalPeriods: directional.length,
      hasWeeklyVote,
      evidenceZh,
    };
  }

  const weekAgrees = weekVote?.direction === direction;
  const monthAgrees = monthVote?.direction === direction;
  const coreAgreement = Boolean(weekAgrees && monthAgrees);
  const alignedWeight = same.reduce((sum, vote) => sum + vote.weight, 0);

  let strengthZh: ResonanceStrength;
  let tier: number;
  if (coreAgreement && same.length >= 4) {
    strengthZh = "极强共振";
    tier = 5;
  } else if (coreAgreement) {
    strengthZh = "强共振";
    tier = 4;
  } else if (weekAgrees && same.length >= 2) {
    strengthZh = "方向明确";
    tier = 3;
  } else if (weekAgrees) {
    strengthZh = "单周期明确";
    tier = 2;
  } else if (same.length >= 2) {
    strengthZh = "方向明确";
    tier = 1;
  } else {
    strengthZh = "单周期明确";
    tier = 0;
  }

  // Strong weekly evidence must always outrank a long-horizon-only call.
  const score = tier * 10_000 + same.length * 500 + alignedWeight;
  return {
    direction,
    strengthZh,
    score,
    sameDirectionPeriods: same.length,
    directionalPeriods: directional.length,
    hasWeeklyVote,
    evidenceZh,
  };
}
