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
 * Weekly remains authoritative whenever it has a side. POSITION alone may use
 * a supplied monthly leg when the week has no direction. This helper only
 * aligns metadata with an already-allowed fallback; it never manufactures or
 * reverses a direction.
 */
export function resolveForecastAuthorityContext(
  plan: PredictionStrategyPlan | undefined,
  strategyType: ThreeHorizonStrategyType,
): ForecastAuthorityContext {
  if (!plan) {
    return { direction: "NEUTRAL", confidence: 0, setup: "MISSING_FORECAST", sourceHorizon: null };
  }

  if (plan.weeklyForecast && plan.weeklyDirection !== "NEUTRAL") {
    return {
      direction: plan.weeklyDirection,
      confidence: plan.weeklyForecast.confidence,
      setup: setupFor(plan.weeklyDirection, true),
      sourceHorizon: "WEEK",
    };
  }

  if (strategyType === "POSITION" && plan.monthlyForecast && plan.monthlyDirection !== "NEUTRAL") {
    return {
      direction: plan.monthlyDirection,
      confidence: plan.monthlyForecast.confidence,
      setup: setupFor(plan.monthlyDirection, true),
      sourceHorizon: "MONTH",
    };
  }

  return {
    direction: "NEUTRAL",
    confidence: plan.weeklyForecast?.confidence ?? 0,
    setup: setupFor("NEUTRAL", Boolean(plan.weeklyForecast)),
    sourceHorizon: plan.weeklyForecast ? "WEEK" : null,
  };
}
