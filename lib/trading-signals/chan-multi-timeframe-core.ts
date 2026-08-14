import type {
  ChanDirection,
  ChanMultiTimeframeDecision,
  ChanMultiTimeframeFrame,
  ChanStructure,
} from "@/types/chan-execution";

export const CHAN_V2_TIMEFRAMES = ["30m", "1H", "4H", "1D"] as const;

function structureSignal(structure: ChanStructure): "BULL" | "BEAR" | "NONE" {
  const bullish = structure.buyPoint === "SECOND" || structure.buyPoint === "THIRD";
  const bearish = structure.sellPoint === "SECOND" || structure.sellPoint === "THIRD";
  if (bullish === bearish) return "NONE";
  return bullish ? "BULL" : "BEAR";
}

function directionRisk(
  direction: ChanDirection,
  frames: ChanMultiTimeframeFrame[]
): { confirmation: number | null; invalidation: number | null } {
  if (direction === "NEUTRAL") return { confirmation: null, invalidation: null };
  const levels = frames.flatMap((frame) => {
    const risk = direction === "BULL" ? frame.structure.riskLevels.long : frame.structure.riskLevels.short;
    return risk ? [risk] : [];
  });
  if (!levels.length) return { confirmation: null, invalidation: null };
  return direction === "BULL"
    ? {
        confirmation: Math.max(...levels.map((level) => level.breakevenTrigger)),
        invalidation: Math.max(...levels.map((level) => level.invalidation)),
      }
    : {
        confirmation: Math.min(...levels.map((level) => level.breakevenTrigger)),
        invalidation: Math.min(...levels.map((level) => level.invalidation)),
      };
}

export function decideChanMultiTimeframe(input: {
  authoritativeDirection: ChanDirection;
  frames: ChanMultiTimeframeFrame[];
}): ChanMultiTimeframeDecision {
  const byTimeframe = new Map(input.frames.map((frame) => [frame.timeframe, frame]));
  const ordered = CHAN_V2_TIMEFRAMES.map((timeframe) => byTimeframe.get(timeframe));
  const timeframeSignals = CHAN_V2_TIMEFRAMES.map((timeframe, index) => {
    const frame = ordered[index];
    return {
      timeframe,
      signal: frame ? structureSignal(frame.structure) : "NONE" as const,
      complete: Boolean(frame?.structure.sufficient && frame.structure.trendState === "COMPLETE"),
      available: Boolean(frame && !frame.error),
    };
  });
  const reasons: string[] = [];
  if (input.authoritativeDirection === "NEUTRAL") reasons.push("AUTHORITATIVE_DIRECTION_UNAVAILABLE");
  if (timeframeSignals.some((row) => !row.available)) reasons.push("TIMEFRAME_DATA_UNAVAILABLE");
  if (timeframeSignals.some((row) => !row.complete)) reasons.push("TIMEFRAME_STRUCTURE_INCOMPLETE");
  const directional = timeframeSignals.map((row) => row.signal);
  const bullCount = timeframeSignals.filter((row) => row.available && row.complete && row.signal === "BULL").length;
  const bearCount = timeframeSignals.filter((row) => row.available && row.complete && row.signal === "BEAR").length;
  const technicalBias = bullCount > 0 && bearCount === 0
    ? "BULL"
    : bearCount > 0 && bullCount === 0
      ? "BEAR"
      : bullCount > 0 || bearCount > 0
        ? "MIXED"
        : "NONE";
  const dominantCount = bullCount === bearCount ? 0 : Math.max(bullCount, bearCount);
  const chanContribution = Number((dominantCount / CHAN_V2_TIMEFRAMES.length * 35).toFixed(2));
  if (directional.some((signal) => signal === "NONE") || new Set(directional).size !== 1) {
    reasons.push("TIMEFRAME_CONFLICT_OR_NO_ENTRY");
  }
  const unanimous = directional[0] ?? "NONE";
  if (
    input.authoritativeDirection !== "NEUTRAL" &&
    unanimous !== "NONE" &&
    unanimous !== input.authoritativeDirection
  ) reasons.push("STRUCTURE_OPPOSES_AUTHORITY");

  const risk = directionRisk(input.authoritativeDirection, input.frames);
  const action = reasons.length
    ? "WAIT"
    : input.authoritativeDirection === "BULL"
      ? "BUY_CANDIDATE"
      : "SELL_CANDIDATE";
  return {
    action,
    authoritativeDirection: input.authoritativeDirection,
    reasons: [...new Set(reasons)],
    technicalBias,
    chanWeight: 35,
    chanContribution,
    ...risk,
    timeframeSignals,
    executionAuthority: "RESEARCH_ONLY",
    tradingEligible: false,
  };
}
