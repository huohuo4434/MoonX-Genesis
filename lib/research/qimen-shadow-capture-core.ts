import { z } from "zod";

import {
  buildQimenShadowTrials,
  type QimenShadowCandle,
  type QimenShadowSetup,
  type QimenShadowTrial,
} from "@/lib/research/qimen-shadow-ab-core";

const isoTime = z.string().min(20).max(40).refine((value) => Number.isFinite(Date.parse(value)), "时间格式无效");
const boundedText = z.string().trim().min(1).max(200);
const sha256 = z.string().regex(/^[a-f0-9]{64}$/i, "证据哈希必须是SHA-256");

export const qimenShadowMethodReadingSchema = z.object({
  schoolId: z.enum(["OBJECT_YONGSHEN", "DIRECTIONAL_PALACE"]),
  direction: z.enum(["UP", "DOWN", "SIDEWAYS"]),
  confidence: z.number().finite().min(0).max(100),
  readiness: z.enum(["FORWARD_READY", "RESEARCH_ONLY", "UNAVAILABLE"]),
  sourceId: boundedText,
  chartId: boundedText,
  recordedAt: isoTime,
  evidenceSha256: sha256,
}).strict().superRefine((value, context) => {
  if (value.schoolId === "DIRECTIONAL_PALACE" && value.readiness === "FORWARD_READY") {
    context.addIssue({ code: "custom", path: ["readiness"], message: "定向取宫流派仍处研究期，不能标为正式前瞻就绪" });
  }
});

const candleSchema = z.object({
  openTime: isoTime,
  closeTime: isoTime,
  open: z.number().finite().positive(),
  high: z.number().finite().positive(),
  low: z.number().finite().positive(),
  close: z.number().finite().positive(),
  closed: z.boolean(),
}).strict();

export const qimenShadowObservationSchema = z.object({
  observationId: z.string().trim().min(3).max(160).regex(/^[A-Za-z0-9._:-]+$/),
  formalForecastKind: z.enum(["WEEKLY", "DAILY"]),
  formalForecastId: boundedText,
  expectedFormalForecastVersion: z.string().regex(/^V[1-9]\d*$/).optional(),
  horizon: z.enum(["INTRADAY", "SWING", "POSITION"]),
  decisionAt: isoTime,
  evaluationDueAt: isoTime,
  candleIntervalMinutes: z.number().int().min(1).max(1_440),
  technicalSourceId: boundedText,
  technicalRecordedAt: isoTime,
  baseTriggered: z.boolean(),
  entryPrice: z.number().finite().positive(),
  stopPrice: z.number().finite().positive(),
  target1: z.number().finite().positive(),
  target2: z.number().finite().positive(),
  target3: z.number().finite().positive(),
  methodReadings: z.array(qimenShadowMethodReadingSchema).max(2),
}).strict();

export const qimenShadowCandidateSchema = z.object({
  candidateId: z.string().trim().min(3).max(160).regex(/^[A-Za-z0-9._:-]+$/),
  formalForecastKind: z.enum(["WEEKLY", "DAILY"]),
  formalForecastId: boundedText,
  horizon: z.enum(["INTRADAY", "SWING", "POSITION"]),
  decisionAt: isoTime,
  evaluationDueAt: isoTime,
  methodReadings: z.array(qimenShadowMethodReadingSchema).length(2),
}).strict().superRefine((value, context) => {
  const schools = new Set(value.methodReadings.map((item) => item.schoolId));
  if (schools.size !== 2 || !schools.has("OBJECT_YONGSHEN") || !schools.has("DIRECTIONAL_PALACE")) {
    context.addIssue({ code: "custom", path: ["methodReadings"], message: "候选必须各包含一条对象用神与定向取宫读数" });
  }
});

export const qimenShadowEvaluationSchema = z.object({
  observationId: z.string().trim().min(3).max(160).regex(/^[A-Za-z0-9._:-]+$/),
  evaluatedAt: isoTime,
  candles: z.array(candleSchema).min(1).max(1000),
}).strict();

export const qimenShadowAdminRequestSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("REGISTER_CANDIDATE"), candidate: qimenShadowCandidateSchema }).strict(),
  z.object({ action: z.literal("LOCK_OBSERVATION"), observation: qimenShadowObservationSchema }).strict(),
  z.object({ action: z.literal("EVALUATE"), evaluation: qimenShadowEvaluationSchema }).strict(),
]);

export type QimenShadowObservationInput = z.infer<typeof qimenShadowObservationSchema>;
export type QimenShadowEvaluationInput = z.infer<typeof qimenShadowEvaluationSchema>;
export type QimenShadowCandidateInput = z.infer<typeof qimenShadowCandidateSchema>;

export type QimenFormalForecastSnapshot = {
  kind: "WEEKLY" | "DAILY";
  id: string;
  marketCode: string;
  periodStart: string;
  periodEnd: string;
  direction: string;
  version: number;
  status: string;
  publishedAt: Date | null;
  lockedAt: Date | null;
};

export type PreparedQimenShadowEvaluation = {
  setup: QimenShadowSetup;
  candles: QimenShadowCandle[];
  trials: QimenShadowTrial[];
};

export type PreparedQimenShadowObservation = {
  setup: QimenShadowSetup;
  evaluationDueAt: string;
};

export type PreparedQimenShadowCandidate = {
  candidateId: string;
  symbol: string;
  horizon: QimenShadowSetup["horizon"];
  officialDirection: QimenShadowSetup["officialDirection"];
  formalForecastKind: "WEEKLY" | "DAILY";
  formalForecastId: string;
  formalForecastVersion: string;
  forecastPublishedAt: string;
  forecastLockedAt: string;
  forecastValidFrom: string;
  forecastValidUntil: string;
  decisionAt: string;
  evaluationDueAt: string;
  candleIntervalMinutes: 60;
  methodReadings: QimenShadowSetup["methodReadings"];
};

const LONG_DIRECTIONS = new Set(["上涨", "震荡上涨", "先跌后涨", "UP", "BULL", "LONG"]);
const SHORT_DIRECTIONS = new Set(["下跌", "震荡下跌", "先涨后跌", "DOWN", "BEAR", "SHORT"]);

function officialDirection(value: string): "LONG" | "SHORT" {
  const normalized = value.trim().toUpperCase();
  if (LONG_DIRECTIONS.has(value.trim()) || LONG_DIRECTIONS.has(normalized)) return "LONG";
  if (SHORT_DIRECTIONS.has(value.trim()) || SHORT_DIRECTIONS.has(normalized)) return "SHORT";
  throw new Error("正式预测是震荡或未知方向，不能创建方向型影子观察。");
}

function marketBoundary(date: string, end: boolean): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("正式预测周期日期无效。");
  const suffix = end ? "T23:59:59.999+08:00" : "T00:00:00.000+08:00";
  const parsed = new Date(`${date}${suffix}`);
  if (!Number.isFinite(parsed.getTime())) throw new Error("正式预测周期日期无效。");
  return parsed.toISOString();
}

export function prepareQimenShadowCandidate(
  input: QimenShadowCandidateInput,
  formal: QimenFormalForecastSnapshot,
): PreparedQimenShadowCandidate {
  if (formal.id !== input.formalForecastId || formal.kind !== input.formalForecastKind) throw new Error("正式预测绑定不匹配。");
  if (formal.status !== "LOCKED" || !formal.publishedAt || !formal.lockedAt) throw new Error("只有已经发布并锁定的正式预测可以进入候选池。");
  if (!Number.isInteger(formal.version) || formal.version < 1) throw new Error("正式预测版本无效。");
  const direction = officialDirection(formal.direction);
  const decisionAt = Date.parse(input.decisionAt);
  const evaluationDueAt = Date.parse(input.evaluationDueAt);
  const validFrom = Date.parse(marketBoundary(formal.periodStart, false));
  const validUntil = Date.parse(marketBoundary(formal.periodEnd, true));
  if (formal.publishedAt.getTime() > decisionAt || formal.lockedAt.getTime() > decisionAt || validFrom > decisionAt) {
    throw new Error("候选决策时不存在有效、已发布且已锁定的正式预测。");
  }
  if (evaluationDueAt <= decisionAt || evaluationDueAt > validUntil) throw new Error("候选评估窗口超出正式预测有效期。");
  if (decisionAt % 3_600_000 !== 0 || evaluationDueAt % 3_600_000 !== 0) throw new Error("自动采集第一版要求整点1小时窗口。");
  const candleCount = (evaluationDueAt - decisionAt) / 3_600_000;
  if (!Number.isInteger(candleCount) || candleCount < 1 || candleCount > 120) throw new Error("自动评价窗口必须包含1至120根1小时K线。");
  if (input.methodReadings.some((item) => Date.parse(item.recordedAt) > decisionAt)) throw new Error("两种奇门读数必须在决策前记录。");
  return {
    candidateId: input.candidateId,
    symbol: formal.marketCode.trim().toUpperCase(),
    horizon: input.horizon,
    officialDirection: direction,
    formalForecastKind: input.formalForecastKind,
    formalForecastId: formal.id,
    formalForecastVersion: `V${formal.version}`,
    forecastPublishedAt: formal.publishedAt.toISOString(),
    forecastLockedAt: formal.lockedAt.toISOString(),
    forecastValidFrom: new Date(validFrom).toISOString(),
    forecastValidUntil: new Date(validUntil).toISOString(),
    decisionAt: input.decisionAt,
    evaluationDueAt: input.evaluationDueAt,
    candleIntervalMinutes: 60,
    methodReadings: [...input.methodReadings].sort((a, b) => a.schoolId.localeCompare(b.schoolId)),
  };
}

export function prepareQimenShadowObservation(input: QimenShadowObservationInput, formal: QimenFormalForecastSnapshot): PreparedQimenShadowObservation {
  if (formal.id !== input.formalForecastId || formal.kind !== input.formalForecastKind) throw new Error("正式预测绑定不匹配。");
  if (formal.status !== "LOCKED" || !formal.publishedAt || !formal.lockedAt) throw new Error("只有已经发布并锁定的正式预测可以进入影子研究。");
  if (!Number.isInteger(formal.version) || formal.version < 1) throw new Error("正式预测版本无效。");
  if (input.expectedFormalForecastVersion && input.expectedFormalForecastVersion !== `V${formal.version}`) throw new Error("正式预测版本已变化，自动观察拒绝绑定新版本。");
  if (Date.parse(input.evaluationDueAt) <= Date.parse(input.decisionAt)) throw new Error("评估到期时间必须晚于决策时间。");
  const setup: QimenShadowSetup = {
    experimentId: input.observationId,
    symbol: formal.marketCode.trim().toUpperCase(),
    horizon: input.horizon,
    officialDirection: officialDirection(formal.direction),
    formalForecastId: formal.id,
    formalForecastVersion: `V${formal.version}`,
    forecastPublishedAt: formal.publishedAt.toISOString(),
    forecastLockedAt: formal.lockedAt.toISOString(),
    forecastValidFrom: marketBoundary(formal.periodStart, false),
    forecastValidUntil: marketBoundary(formal.periodEnd, true),
    decisionAt: input.decisionAt,
    evaluationDueAt: input.evaluationDueAt,
    evaluatedAt: input.decisionAt,
    candleIntervalMinutes: input.candleIntervalMinutes,
    technicalSourceId: input.technicalSourceId,
    technicalRecordedAt: input.technicalRecordedAt,
    baseTriggered: input.baseTriggered,
    entryPrice: input.entryPrice,
    stopPrice: input.stopPrice,
    target1: input.target1,
    target2: input.target2,
    target3: input.target3,
    methodReadings: [...input.methodReadings].sort((a, b) => a.schoolId.localeCompare(b.schoolId)),
  };
  buildQimenShadowTrials({ setup, candles: [] });
  return { setup, evaluationDueAt: input.evaluationDueAt };
}

export function prepareQimenShadowEvaluation(observation: PreparedQimenShadowObservation, input: QimenShadowEvaluationInput): PreparedQimenShadowEvaluation {
  const observationSetup = observation.setup;
  if (observationSetup.experimentId !== input.observationId) throw new Error("评估与前瞻观察编号不匹配。");
  if (Date.parse(input.evaluatedAt) < Date.parse(observation.evaluationDueAt)) throw new Error("尚未到预先锁定的评估时间。");
  const setup = { ...observationSetup, evaluatedAt: input.evaluatedAt };
  const candles = [...input.candles].sort((a, b) => Date.parse(a.openTime) - Date.parse(b.openTime));
  const trials = buildQimenShadowTrials({ setup, candles });
  return { setup, candles, trials };
}
