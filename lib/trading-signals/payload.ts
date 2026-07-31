import type { TradeSignalApiPayload, TradeSignalRecord } from "@/types/trading-signal";

export function toTradeSignalApiPayload(signal: TradeSignalRecord): TradeSignalApiPayload {
  return {
    schema: "moonx.trade.signal.v1",
    generatedAt: new Date().toISOString(),
    signal: {
      id: signal.id,
      asset: {
        id: signal.assetId,
        symbol: signal.symbol,
        name: signal.assetName,
        market: signal.market,
      },
      timeframe: signal.timeframe,
      direction: signal.direction,
      status: signal.status,
      confidence: { stars: signal.starLevel, score: signal.consensusScore },
      entry: {
        mode: signal.entryMode,
        low: signal.entryLow,
        high: signal.entryHigh,
        trigger: signal.triggerPrice,
      },
      risk: {
        stopLoss: signal.stopLoss,
        confirmationTimeframe: signal.stopConfirmTimeframe,
        maxRiskPct: signal.maxRiskPct,
        positionSizePct: signal.positionSizePct,
      },
      targets: [signal.target1, signal.target2, signal.target3].filter(
        (value): value is number => value != null
      ),
      execution: {
        quantity: signal.quantity,
        notionalAmount: signal.notionalAmount,
        paperOnly: signal.paperOnly,
      },
      validFrom: signal.validFrom,
      validUntil: signal.validUntil,
      rationale: signal.rationale,
      executionPlan: signal.executionPlan,
      invalidation: signal.invalidation,
      methods: signal.methods.map((method) => ({
        method: method.method,
        direction: method.direction,
        weight: method.weight,
        confidence: method.confidence,
        evidence: method.evidence,
      })),
    },
  };
}
