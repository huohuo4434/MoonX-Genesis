import type { ChanCandle, ChanInstrument, ChanStage } from "@/types/chan-execution";

import type {
  PreparedQimenShadowCandidate,
  QimenShadowObservationInput,
} from "@/lib/research/qimen-shadow-capture-core";

export const QIMEN_SHADOW_AUTOMATION_SCHEMA = "moox.qimen-shadow-automation.v1" as const;
export const QIMEN_SHADOW_LOCK_MIN_LEAD_MS = 2 * 60_000;
export const QIMEN_SHADOW_LOCK_MAX_LEAD_MS = 30 * 60_000;

export class QimenShadowAutomationSkipError extends Error {}

const CRYPTO_INSTRUMENTS: Record<string, ChanInstrument> = {
  BTC: { symbol: "BTC", label: "Bitcoin", provider: "BITGET_PUBLIC", providerSymbol: "BTCUSDT", formalPlanSymbol: "BTC", market: "CRYPTO" },
  ETH: { symbol: "ETH", label: "Ethereum", provider: "BITGET_PUBLIC", providerSymbol: "ETHUSDT", formalPlanSymbol: "ETH", market: "CRYPTO" },
  SOL: { symbol: "SOL", label: "Solana", provider: "BITGET_PUBLIC", providerSymbol: "SOLUSDT", formalPlanSymbol: "SOL", market: "CRYPTO" },
  HYPE: { symbol: "HYPE", label: "Hyperliquid", provider: "BITGET_PUBLIC", providerSymbol: "HYPEUSDT", formalPlanSymbol: "HYPE", market: "CRYPTO" },
};

function normalizeSymbol(value: string): string {
  return value.trim().toUpperCase().replace(/[-_/]/g, "").replace(/USDT(?:PERP)?$/, "");
}

export function resolveQimenShadowAutomationInstrument(symbol: string): ChanInstrument | null {
  return CRYPTO_INSTRUMENTS[normalizeSymbol(symbol)] ?? null;
}

export function classifyQimenShadowCandidateTiming(
  decisionAt: string,
  nowMs: number,
): "TOO_EARLY" | "READY" | "TOO_LATE" {
  const lead = Date.parse(decisionAt) - nowMs;
  if (!Number.isFinite(lead) || lead < QIMEN_SHADOW_LOCK_MIN_LEAD_MS) return "TOO_LATE";
  if (lead > QIMEN_SHADOW_LOCK_MAX_LEAD_MS) return "TOO_EARLY";
  return "READY";
}

function positive(value: number | null): value is number {
  return value != null && Number.isFinite(value) && value > 0;
}

export function buildQimenShadowObservationFromTechnical(input: {
  candidate: PreparedQimenShadowCandidate;
  stage: ChanStage;
  technicalRecordedAt: string;
}): QimenShadowObservationInput {
  const { candidate, stage } = input;
  const recordedAt = Date.parse(input.technicalRecordedAt);
  const decisionAt = Date.parse(candidate.decisionAt);
  if (!Number.isFinite(recordedAt) || recordedAt > decisionAt || decisionAt - recordedAt > QIMEN_SHADOW_LOCK_MAX_LEAD_MS) {
    throw new QimenShadowAutomationSkipError("技术结构必须在决策前30分钟内记录。");
  }
  const expectedDirection = candidate.officialDirection === "LONG" ? "BULL" : "BEAR";
  if (stage.status !== "ACTIVE" || stage.direction !== expectedDirection || !positive(stage.confirmation) || !positive(stage.invalidation)) {
    throw new QimenShadowAutomationSkipError("技术结构尚未形成与正式方向一致的有效二买/三买或二卖/三卖。");
  }
  const entry = stage.confirmation;
  const stop = stage.invalidation;
  if ((candidate.officialDirection === "LONG" && entry <= stop) || (candidate.officialDirection === "SHORT" && entry >= stop)) {
    throw new QimenShadowAutomationSkipError("技术确认位与失效位几何关系无效。");
  }
  const risk = Math.abs(entry - stop);
  const multiplier = candidate.officialDirection === "LONG" ? 1 : -1;
  const targets = [1, 2, 3].map((multiple) => entry + multiplier * risk * multiple);
  if (targets.some((target) => !Number.isFinite(target) || target <= 0)) throw new QimenShadowAutomationSkipError("技术结构不能生成有效的固定R评价目标。");
  return {
    observationId: candidate.candidateId,
    formalForecastKind: candidate.formalForecastKind,
    formalForecastId: candidate.formalForecastId,
    expectedFormalForecastVersion: candidate.formalForecastVersion,
    horizon: candidate.horizon,
    decisionAt: candidate.decisionAt,
    evaluationDueAt: candidate.evaluationDueAt,
    candleIntervalMinutes: candidate.candleIntervalMinutes,
    technicalSourceId: `CHAN_1H:${stage.code}:${input.technicalRecordedAt}`,
    technicalRecordedAt: input.technicalRecordedAt,
    baseTriggered: true,
    entryPrice: entry,
    stopPrice: stop,
    target1: targets[0]!,
    target2: targets[1]!,
    target3: targets[2]!,
    methodReadings: [...candidate.methodReadings],
  };
}

export function mapClosedHourlyCandlesForEvaluation(input: {
  candles: ChanCandle[];
  decisionAt: string;
  evaluationDueAt: string;
}) {
  const start = Date.parse(input.decisionAt);
  const end = Date.parse(input.evaluationDueAt);
  return input.candles
    .filter((candle) => candle.timestamp >= start && candle.timestamp < end)
    .sort((a, b) => a.timestamp - b.timestamp)
    .map((candle) => ({
      openTime: new Date(candle.timestamp).toISOString(),
      closeTime: new Date(candle.timestamp + 3_600_000).toISOString(),
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      closed: true,
    }));
}
