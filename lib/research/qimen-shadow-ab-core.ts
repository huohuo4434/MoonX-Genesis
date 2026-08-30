import {
  combineIndependentQimenReadings,
  type QimenSchoolCommitteeResult,
  type QimenSchoolDirection,
  type QimenSchoolId,
  type QimenSchoolReading,
} from "@/lib/forecasts/qimen-school-separation-core";

export const QIMEN_SHADOW_LEDGER_SCHEMA = "moox.qimen-shadow-ab.v1" as const;
export const QIMEN_SHADOW_MIN_OBSERVATIONS = 30;
export const QIMEN_SHADOW_MIN_STABLE_DAYS = 30;
export const QIMEN_SHADOW_MIN_ENTERED = 10;

export type QimenShadowVariantId =
  | "BASE_FORMAL_CHAN"
  | "OBJECT_YONGSHEN_FILTER"
  | "DIRECTIONAL_PALACE_FILTER"
  | "QIMEN_RESONANCE_FILTER"
  | "QIMEN_DIVERGENCE_GUARD";

export type QimenShadowDirection = "LONG" | "SHORT";
export type QimenShadowHorizon = "INTRADAY" | "SWING" | "POSITION";
export type QimenShadowAction = "ENTER" | "WAIT";
export type QimenShadowOutcome =
  | "NO_ENTRY"
  | "STOP_FIRST"
  | "TARGET1_THEN_STOP"
  | "TARGET2_THEN_STOP"
  | "TARGET3"
  | "EXPIRED";

export type QimenShadowCandle = {
  openTime: string;
  closeTime: string;
  open: number;
  high: number;
  low: number;
  close: number;
  closed: boolean;
};

export type QimenShadowMethodReading = QimenSchoolReading & {
  recordedAt: string;
};

export type QimenShadowSetup = {
  experimentId: string;
  symbol: string;
  horizon: QimenShadowHorizon;
  officialDirection: QimenShadowDirection;
  formalForecastId: string;
  formalForecastVersion: string;
  forecastPublishedAt: string;
  forecastLockedAt: string;
  forecastValidFrom: string;
  forecastValidUntil: string;
  decisionAt: string;
  evaluatedAt: string;
  baseTriggered: boolean;
  entryPrice: number;
  stopPrice: number;
  target1: number;
  target2: number;
  target3: number;
  methodReadings: readonly QimenShadowMethodReading[];
};

export type QimenShadowTrial = {
  schema: typeof QIMEN_SHADOW_LEDGER_SCHEMA;
  experimentId: string;
  symbol: string;
  horizon: QimenShadowHorizon;
  variantId: QimenShadowVariantId;
  officialDirection: QimenShadowDirection;
  action: QimenShadowAction;
  actionReason: string;
  enteredAt: string | null;
  outcome: QimenShadowOutcome;
  targetHits: number;
  realizedR: number | null;
  mfeR: number | null;
  maeR: number | null;
  committee: QimenSchoolCommitteeResult;
  sourceForecastId: string;
  sourceForecastVersion: string;
  decisionAt: string;
  evaluatedAt: string;
  researchOnly: true;
  tradingEligible: false;
};

export type QimenShadowVariantSummary = {
  variantId: QimenShadowVariantId;
  observations: number;
  entered: number;
  waited: number;
  positiveOutcomes: number;
  stoppedFirst: number;
  avoidedBaselineLosses: number;
  averageR: number | null;
  profitFactor: number | null;
  averageMfeR: number | null;
  averageMaeR: number | null;
  stableDays: number;
  sampleReady: boolean;
  researchQualified: boolean;
  mayEnableLive: false;
};

const VARIANTS: readonly QimenShadowVariantId[] = [
  "BASE_FORMAL_CHAN",
  "OBJECT_YONGSHEN_FILTER",
  "DIRECTIONAL_PALACE_FILTER",
  "QIMEN_RESONANCE_FILTER",
  "QIMEN_DIVERGENCE_GUARD",
];

function timestamp(value: string, label: string): number {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new Error(`${label}不是有效时间。`);
  return parsed;
}

function round(value: number, digits = 3): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function expectedQimenDirection(direction: QimenShadowDirection): QimenSchoolDirection {
  return direction === "LONG" ? "UP" : "DOWN";
}

function assertGeometry(setup: QimenShadowSetup): void {
  const prices = [setup.entryPrice, setup.stopPrice, setup.target1, setup.target2, setup.target3];
  if (!prices.every((value) => Number.isFinite(value) && value > 0)) throw new Error("入场、止损和止盈必须是有效正数。 ".trim());
  if (setup.officialDirection === "LONG") {
    if (!(setup.stopPrice < setup.entryPrice && setup.entryPrice < setup.target1 && setup.target1 < setup.target2 && setup.target2 < setup.target3)) {
      throw new Error("LONG价格结构无效。 ".trim());
    }
  } else if (!(setup.target3 < setup.target2 && setup.target2 < setup.target1 && setup.target1 < setup.entryPrice && setup.entryPrice < setup.stopPrice)) {
    throw new Error("SHORT价格结构无效。 ".trim());
  }
}

function validateSetup(setup: QimenShadowSetup): void {
  if (!setup.experimentId.trim() || !setup.symbol.trim() || !setup.formalForecastId.trim() || !setup.formalForecastVersion.trim()) {
    throw new Error("影子实验缺少身份或正式预测绑定。 ".trim());
  }
  const publishedAt = timestamp(setup.forecastPublishedAt, "正式预测发布时间");
  const lockedAt = timestamp(setup.forecastLockedAt, "正式预测锁定时间");
  const validFrom = timestamp(setup.forecastValidFrom, "正式预测有效起点");
  const validUntil = timestamp(setup.forecastValidUntil, "正式预测有效终点");
  const decisionAt = timestamp(setup.decisionAt, "决策时间");
  const evaluatedAt = timestamp(setup.evaluatedAt, "评估时间");
  if (publishedAt > decisionAt || lockedAt > decisionAt || validFrom > decisionAt || validUntil < decisionAt) {
    throw new Error("决策时不存在有效、已发布且已锁定的正式预测。 ".trim());
  }
  if (evaluatedAt < decisionAt) throw new Error("评估时间不能早于决策时间。 ".trim());
  if (setup.methodReadings.some((item) => timestamp(item.recordedAt, "方法记录时间") > decisionAt)) {
    throw new Error("包含决策后补录的方法结论，不得进入前瞻影子账本。 ".trim());
  }
  if (setup.methodReadings.some((item) => !item.sourceId.trim() || !item.chartId.trim())) {
    throw new Error("奇门方法读数缺少可追溯来源或盘面标识。 ".trim());
  }
  if (setup.methodReadings.some((item) => !Number.isFinite(item.confidence) || item.confidence < 0 || item.confidence > 100)) {
    throw new Error("奇门方法置信度必须在0到100之间。 ".trim());
  }
  if (new Set(setup.methodReadings.map((item) => item.schoolId)).size !== setup.methodReadings.length) {
    throw new Error("同一流派存在重复读数。 ".trim());
  }
  assertGeometry(setup);
}

function validateCandles(
  setup: QimenShadowSetup,
  candles: readonly QimenShadowCandle[],
): QimenShadowCandle[] {
  const decisionAt = timestamp(setup.decisionAt, "决策时间");
  const evaluatedAt = timestamp(setup.evaluatedAt, "评估时间");
  const seen = new Set<string>();
  return candles
    .map((item) => {
      const openTime = timestamp(item.openTime, "K线开始时间");
      const closeTime = timestamp(item.closeTime, "K线结束时间");
      if (!item.closed || closeTime > evaluatedAt) throw new Error("影子评估只能使用评估时点前已闭合的K线。 ".trim());
      if (openTime >= closeTime) throw new Error("K线时间结构无效。 ".trim());
      if (!(item.low > 0 && item.high >= item.low && item.open >= item.low && item.open <= item.high && item.close >= item.low && item.close <= item.high)) {
        throw new Error("K线价格结构无效。 ".trim());
      }
      const identity = `${item.openTime}|${item.closeTime}`;
      if (seen.has(identity)) throw new Error("影子评估包含重复K线。 ".trim());
      seen.add(identity);
      return { item, openTime, closeTime };
    })
    .filter(({ openTime, closeTime }) => closeTime > decisionAt && openTime <= evaluatedAt)
    .sort((a, b) => a.openTime - b.openTime)
    .map(({ item }) => item);
}

function committeeFor(setup: QimenShadowSetup): QimenSchoolCommitteeResult {
  return combineIndependentQimenReadings(setup.methodReadings);
}

function methodReading(setup: QimenShadowSetup, schoolId: QimenSchoolId): QimenShadowMethodReading | null {
  return setup.methodReadings.find((item) => item.schoolId === schoolId && item.readiness !== "UNAVAILABLE") ?? null;
}

function actionForVariant(input: {
  setup: QimenShadowSetup;
  variantId: QimenShadowVariantId;
  committee: QimenSchoolCommitteeResult;
}): { action: QimenShadowAction; reason: string } {
  if (!input.setup.baseTriggered) return { action: "WAIT", reason: "基础技术触发未完成。" };
  const aligned = expectedQimenDirection(input.setup.officialDirection);
  if (input.variantId === "BASE_FORMAL_CHAN") return { action: "ENTER", reason: "仅使用正式方向与基础技术触发。" };
  if (input.variantId === "OBJECT_YONGSHEN_FILTER") {
    const reading = methodReading(input.setup, "OBJECT_YONGSHEN");
    return reading?.direction === aligned
      ? { action: "ENTER", reason: "对象用神流派与正式方向同向。" }
      : { action: "WAIT", reason: "对象用神流派缺失或未与正式方向同向。" };
  }
  if (input.variantId === "DIRECTIONAL_PALACE_FILTER") {
    const reading = methodReading(input.setup, "DIRECTIONAL_PALACE");
    return reading?.direction === aligned
      ? { action: "ENTER", reason: "定向取宫流派与正式方向同向。" }
      : { action: "WAIT", reason: "定向取宫流派缺失或未与正式方向同向。" };
  }
  if (input.variantId === "QIMEN_RESONANCE_FILTER") {
    return input.committee.relation === "RESONANCE" && input.committee.timingBias === aligned
      ? { action: "ENTER", reason: "两种奇门方法与正式方向同向共振。" }
      : { action: "WAIT", reason: "没有形成与正式方向同向的方法共振。" };
  }
  return input.committee.relation === "DIVERGENCE"
    ? { action: "WAIT", reason: "两种奇门方法分歧，执行等待保护。" }
    : { action: "ENTER", reason: "没有确认的奇门分歧，沿用基础正式方向。" };
}

function candleRangeContains(candle: QimenShadowCandle, price: number): boolean {
  return candle.low <= price && candle.high >= price;
}

function favorableR(setup: QimenShadowSetup, price: number, risk: number): number {
  return setup.officialDirection === "LONG" ? (price - setup.entryPrice) / risk : (setup.entryPrice - price) / risk;
}

function simulateEnteredTrade(setup: QimenShadowSetup, eligible: readonly QimenShadowCandle[]): Omit<QimenShadowTrial, "schema" | "experimentId" | "symbol" | "horizon" | "variantId" | "officialDirection" | "action" | "actionReason" | "committee" | "sourceForecastId" | "sourceForecastVersion" | "decisionAt" | "evaluatedAt" | "researchOnly" | "tradingEligible"> {
  let enteredAt: string | null = null;
  let targetHits = 0;
  let realizedR = 0;
  let remaining = 1;
  let mfeR = 0;
  let maeR = 0;
  const risk = Math.abs(setup.entryPrice - setup.stopPrice);
  const targetPrices = [setup.target1, setup.target2, setup.target3];

  for (const candle of eligible) {
    if (!enteredAt) {
      if (!candleRangeContains(candle, setup.entryPrice)) continue;
      enteredAt = candle.openTime;
    }
    const favorablePrice = setup.officialDirection === "LONG" ? candle.high : candle.low;
    const adversePrice = setup.officialDirection === "LONG" ? candle.low : candle.high;
    mfeR = Math.max(mfeR, favorableR(setup, favorablePrice, risk));
    maeR = Math.min(maeR, favorableR(setup, adversePrice, risk));
    const stopTouched = candleRangeContains(candle, setup.stopPrice);
    const newlyTouched = targetPrices.reduce((count, price, index) =>
      index >= targetHits && candleRangeContains(candle, price) ? count + 1 : count, 0);

    // With no intrabar sequence, stop wins any same-candle ambiguity. Targets
    // already secured in earlier candles remain realized.
    if (stopTouched) {
      realizedR -= remaining;
      const outcome: QimenShadowOutcome = targetHits === 0 ? "STOP_FIRST" : targetHits === 1 ? "TARGET1_THEN_STOP" : "TARGET2_THEN_STOP";
      return { enteredAt, outcome, targetHits, realizedR: round(realizedR), mfeR: round(mfeR), maeR: round(maeR) };
    }
    if (newlyTouched > 0) {
      const nextHits = Math.min(3, targetHits + newlyTouched);
      for (let index = targetHits; index < nextHits; index += 1) {
        const fraction = index === 0 ? 0.4 : 0.3;
        const targetR = Math.abs(targetPrices[index]! - setup.entryPrice) / risk;
        realizedR += fraction * targetR;
        remaining -= fraction;
      }
      targetHits = nextHits;
      if (targetHits === 3) {
        return { enteredAt, outcome: "TARGET3", targetHits, realizedR: round(realizedR), mfeR: round(mfeR), maeR: round(maeR) };
      }
    }
  }

  if (!enteredAt) return { enteredAt: null, outcome: "NO_ENTRY", targetHits: 0, realizedR: null, mfeR: null, maeR: null };
  const lastClose = eligible.at(-1)?.close ?? setup.entryPrice;
  realizedR += remaining * favorableR(setup, lastClose, risk);
  return { enteredAt, outcome: "EXPIRED", targetHits, realizedR: round(realizedR), mfeR: round(mfeR), maeR: round(maeR) };
}

export function buildQimenShadowTrials(input: {
  setup: QimenShadowSetup;
  candles: readonly QimenShadowCandle[];
}): QimenShadowTrial[] {
  validateSetup(input.setup);
  // Validate once before variant decisions. A WAIT result must not conceal an
  // open or future candle in the experiment input.
  const eligibleCandles = validateCandles(input.setup, input.candles);
  const committee = committeeFor(input.setup);
  return VARIANTS.map((variantId) => {
    const decision = actionForVariant({ setup: input.setup, variantId, committee });
    const simulation = decision.action === "ENTER"
      ? simulateEnteredTrade(input.setup, eligibleCandles)
      : { enteredAt: null, outcome: "NO_ENTRY" as const, targetHits: 0, realizedR: null, mfeR: null, maeR: null };
    return {
      schema: QIMEN_SHADOW_LEDGER_SCHEMA,
      experimentId: input.setup.experimentId,
      symbol: input.setup.symbol,
      horizon: input.setup.horizon,
      variantId,
      officialDirection: input.setup.officialDirection,
      action: decision.action,
      actionReason: decision.reason,
      ...simulation,
      committee,
      sourceForecastId: input.setup.formalForecastId,
      sourceForecastVersion: input.setup.formalForecastVersion,
      decisionAt: input.setup.decisionAt,
      evaluatedAt: input.setup.evaluatedAt,
      researchOnly: true,
      tradingEligible: false,
    };
  });
}

export function summarizeQimenShadowTrials(trials: readonly QimenShadowTrial[]): QimenShadowVariantSummary[] {
  if (trials.some((item) => item.schema !== QIMEN_SHADOW_LEDGER_SCHEMA || item.researchOnly !== true || item.tradingEligible !== false)) {
    throw new Error("影子汇总只接受固定版本的纯研究样本。 ".trim());
  }
  const identities = trials.map((item) => `${item.experimentId}|${item.variantId}`);
  if (new Set(identities).size !== identities.length) {
    throw new Error("同一实验与变体存在重复结果，不得重复计入样本。 ".trim());
  }
  const baselineByExperiment = new Map(
    trials.filter((item) => item.variantId === "BASE_FORMAL_CHAN").map((item) => [item.experimentId, item]),
  );
  return VARIANTS.map((variantId) => {
    const rows = trials.filter((item) => item.variantId === variantId);
    const enteredRows = rows.filter((item) => item.action === "ENTER" && item.realizedR != null);
    const returns = enteredRows.map((item) => item.realizedR!);
    const gains = returns.filter((value) => value > 0).reduce((sum, value) => sum + value, 0);
    const losses = Math.abs(returns.filter((value) => value < 0).reduce((sum, value) => sum + value, 0));
    const dates = [...new Set(rows.map((item) => item.decisionAt.slice(0, 10)))].sort();
    const stableDays = dates.length
      ? Math.floor((Date.parse(`${dates[dates.length - 1]!}T00:00:00Z`) - Date.parse(`${dates[0]!}T00:00:00Z`)) / 86_400_000) + 1
      : 0;
    const avoidedBaselineLosses = rows.filter((item) =>
      item.action === "WAIT" && (baselineByExperiment.get(item.experimentId)?.realizedR ?? 0) < 0
    ).length;
    const sampleReady = rows.length >= QIMEN_SHADOW_MIN_OBSERVATIONS && stableDays >= QIMEN_SHADOW_MIN_STABLE_DAYS;
    const averageR = returns.length ? round(returns.reduce((sum, value) => sum + value, 0) / returns.length) : null;
    const profitFactor = losses > 0 ? round(gains / losses) : gains > 0 ? Number.POSITIVE_INFINITY : null;
    return {
      variantId,
      observations: rows.length,
      entered: enteredRows.length,
      waited: rows.filter((item) => item.action === "WAIT").length,
      positiveOutcomes: returns.filter((value) => value > 0).length,
      stoppedFirst: enteredRows.filter((item) => item.outcome === "STOP_FIRST").length,
      avoidedBaselineLosses,
      averageR,
      profitFactor,
      averageMfeR: enteredRows.length ? round(enteredRows.reduce((sum, item) => sum + (item.mfeR ?? 0), 0) / enteredRows.length) : null,
      averageMaeR: enteredRows.length ? round(enteredRows.reduce((sum, item) => sum + (item.maeR ?? 0), 0) / enteredRows.length) : null,
      stableDays,
      sampleReady,
      researchQualified: Boolean(
        sampleReady
        && enteredRows.length >= QIMEN_SHADOW_MIN_ENTERED
        && averageR != null
        && averageR > 0
        && profitFactor != null
        && profitFactor >= 1.1
      ),
      mayEnableLive: false,
    };
  });
}
