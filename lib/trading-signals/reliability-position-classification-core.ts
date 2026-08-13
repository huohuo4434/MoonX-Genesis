export type ReliabilityTradingEnvironmentMode = "DEMO" | "LIVE_EXPERIMENT";
export type ReliabilityDecisionMode = "DEMO" | "LIVE";

export type ReliabilityPositionIdentity = {
  symbol: string;
  posSide: "long" | "short";
};

export type ReliabilityDecisionIdentity = {
  id: string;
  symbol: string;
  direction: "LONG" | "SHORT" | string;
};

export type ReliabilityProtectionIdentity = {
  symbol: string;
  posSide: "long" | "short";
};

export type ReliabilityPositionClassification<TDecision extends ReliabilityDecisionIdentity> =
  | { kind: "ORPHAN"; decision: null }
  | { kind: "UNPROTECTED"; decision: TDecision }
  | { kind: "PROTECTED"; decision: TDecision };

export function reliabilityDecisionModeForEnvironment(
  mode: ReliabilityTradingEnvironmentMode
): ReliabilityDecisionMode {
  return mode === "LIVE_EXPERIMENT" ? "LIVE" : "DEMO";
}

function decisionSide(direction: string): "long" | "short" | null {
  if (direction === "LONG") return "long";
  if (direction === "SHORT") return "short";
  return null;
}

export function classifyReliabilityPosition<TDecision extends ReliabilityDecisionIdentity>(input: {
  position: ReliabilityPositionIdentity;
  decisions: readonly TDecision[];
  protections: readonly ReliabilityProtectionIdentity[];
}): ReliabilityPositionClassification<TDecision> {
  const decision = input.decisions.find((row) =>
    row.symbol === input.position.symbol && decisionSide(row.direction) === input.position.posSide
  );
  if (!decision) return { kind: "ORPHAN", decision: null };
  const protectedOnExchange = input.protections.some((row) =>
    row.symbol === decision.symbol && row.posSide === decisionSide(decision.direction)
  );
  return protectedOnExchange
    ? { kind: "PROTECTED", decision }
    : { kind: "UNPROTECTED", decision };
}

export function shouldRepairConfirmedMissingProtection(input: {
  occurrenceCount: number;
  requiredOccurrences: number;
}): boolean {
  return input.occurrenceCount >= input.requiredOccurrences;
}
