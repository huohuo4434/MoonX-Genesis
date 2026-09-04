import type { PredictionAutoSetup, PredictionStrategyPlan } from "@/types/prediction-auto-trader";
import type { ThreeHorizonDirection, ThreeHorizonStrategyType } from "@/types/three-horizon-strategy";

export type ForecastAuthorityContext = {
  direction: ThreeHorizonDirection;
  confidence: number;
  setup: PredictionAutoSetup;
  sourceHorizon: "WEEK" | "MONTH" | null;
};

const setupFor = (
  direction: ThreeHorizonDirection,
  available: boolean,
): PredictionAutoSetup => {
  if (!available) return "MISSING_FORECAST";
  if (direction === "LONG") return "BUY_DIP";
  if (direction === "SHORT") return "SELL_RALLY";
  return "HOLD";
};

/**
 * Resolves the forecast evidence that actually owns one execution horizon.
 * Match the execution binding: WEEK for intraday/swing, MONTH for position.
 * Technical timing and the other forecast legs cannot replace that authority.
 */
export function resolveForecastAuthorityContext(
  plan: PredictionStrategyPlan | undefined,
  strategyType: ThreeHorizonStrategyType,
): ForecastAuthorityContext {
  if (!plan) {
    return { direction: "NEUTRAL", confidence: 0, setup: "MISSING_FORECAST", sourceHorizon: null };
  }

  const monthly = strategyType === "POSITION";
  const leg = monthly ? plan.monthlyForecast : plan.weeklyForecast;
  const direction = leg ? (monthly ? plan.monthlyDirection : plan.weeklyDirection) : "NEUTRAL";
  return {
    direction,
    confidence: leg?.confidence ?? 0,
    setup: setupFor(direction, Boolean(leg)),
    sourceHorizon: leg ? (monthly ? "MONTH" : "WEEK") : null,
  };
}
