import "server-only";
import {
  getPredictionAutoTraderSettings,
  resolvePredictionStrategyPlans,
} from "@/lib/trading-signals/prediction-auto-trader";
import { readChanFormalDirectionWithDependencies } from "@/lib/trading-signals/chan-formal-direction-core";

export async function readChanFormalDirection(input: {
  symbol: "BTCUSDT" | "ETHUSDT";
  capturedNowMs: number;
}) {
  return readChanFormalDirectionWithDependencies(input, {
    readSettings: getPredictionAutoTraderSettings,
    resolvePlans: (settings, now, requestedSymbols) =>
      resolvePredictionStrategyPlans(settings, now, requestedSymbols),
  });
}
