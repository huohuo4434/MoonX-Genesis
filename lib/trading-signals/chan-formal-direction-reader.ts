import "server-only";
import {
  getPredictionAutoTraderSettings,
  resolvePredictionStrategyPlans,
} from "@/lib/trading-signals/prediction-auto-trader";
import { readChanFormalDirectionWithDependencies } from "@/lib/trading-signals/chan-formal-direction-core";
import { resolveChanInstrument } from "@/lib/market-data/chan-instrument-catalog";

export async function readChanFormalDirection(input: {
  symbol: string;
  capturedNowMs: number;
}) {
  const instrument = resolveChanInstrument(input.symbol);
  if (!instrument) return { direction: "NEUTRAL" as const, sourceHorizon: null, reason: "UNSUPPORTED_MARKET" };
  return readChanFormalDirectionWithDependencies({ ...input, formalPlanSymbol: instrument.formalPlanSymbol }, {
    readSettings: getPredictionAutoTraderSettings,
    resolvePlans: (settings, now, requestedSymbols) =>
      resolvePredictionStrategyPlans(settings, now, requestedSymbols),
  });
}
