import {
  qimenShadowReadingSchema,
  type QimenFormalForecastSnapshot,
  type QimenShadowReadingInput,
} from "@/lib/research/qimen-shadow-capture-core";

export const QIMEN_SHADOW_READING_SCHEMA = "moox.qimen-shadow-reading.v1" as const;

export type PreparedQimenShadowReading = {
  readingId: string;
  studyKey: string;
  formalForecastKind: "WEEKLY" | "DAILY";
  formalForecastId: string;
  formalForecastVersion: string;
  expectedFormalForecastVersion?: string;
  symbol: string;
  horizon: "INTRADAY" | "SWING" | "POSITION";
  decisionAt: string;
  evaluationDueAt: string;
  reading: QimenShadowReadingInput["reading"];
  sourceEvidence?: QimenShadowReadingInput["sourceEvidence"];
};

function marketBoundary(date: string, end: boolean): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("正式预测周期日期无效。");
  const parsed = Date.parse(`${date}${end ? "T23:59:59.999+08:00" : "T00:00:00.000+08:00"}`);
  if (!Number.isFinite(parsed)) throw new Error("正式预测周期日期无效。");
  return parsed;
}

export function prepareQimenShadowReading(
  raw: QimenShadowReadingInput,
  formal: QimenFormalForecastSnapshot,
): PreparedQimenShadowReading {
  const input = qimenShadowReadingSchema.parse(raw);
  if (formal.kind !== input.formalForecastKind || formal.id !== input.formalForecastId) throw new Error("奇门读数与正式预测绑定不匹配。");
  if (formal.status !== "LOCKED" || !formal.publishedAt || !formal.lockedAt) throw new Error("奇门读数只能绑定已经发布并锁定的正式预测。");
  if (!Number.isInteger(formal.version) || formal.version < 1) throw new Error("正式预测版本无效。");
  if (input.expectedFormalForecastVersion && input.expectedFormalForecastVersion !== `V${formal.version}`) {
    throw new Error("正式预测版本已变化，奇门读数拒绝把旧证据绑定到新版本。");
  }
  const decisionAt = Date.parse(input.decisionAt);
  const evaluationDueAt = Date.parse(input.evaluationDueAt);
  const validFrom = marketBoundary(formal.periodStart, false);
  const validUntil = marketBoundary(formal.periodEnd, true);
  if (formal.publishedAt.getTime() > decisionAt || formal.lockedAt.getTime() > decisionAt || validFrom > decisionAt) {
    throw new Error("读数决策时不存在有效、已发布且已锁定的正式预测。");
  }
  if (decisionAt % 3_600_000 !== 0 || evaluationDueAt % 3_600_000 !== 0) throw new Error("自动配对第一版要求整点1小时窗口。");
  const candles = (evaluationDueAt - decisionAt) / 3_600_000;
  if (!Number.isInteger(candles) || candles < 1 || candles > 120 || evaluationDueAt > validUntil) {
    throw new Error("奇门读数评价窗口必须位于正式预测有效期内并包含1至120根1小时K线。");
  }
  if (Date.parse(input.reading.recordedAt) > decisionAt) throw new Error("奇门读数必须在决策前形成。");
  return {
    readingId: input.readingId,
    studyKey: input.studyKey,
    formalForecastKind: input.formalForecastKind,
    formalForecastId: input.formalForecastId,
    formalForecastVersion: `V${formal.version}`,
    ...(input.expectedFormalForecastVersion ? { expectedFormalForecastVersion: input.expectedFormalForecastVersion } : {}),
    symbol: formal.marketCode.trim().toUpperCase(),
    horizon: input.horizon,
    decisionAt: input.decisionAt,
    evaluationDueAt: input.evaluationDueAt,
    reading: input.reading,
    ...(input.sourceEvidence ? { sourceEvidence: input.sourceEvidence } : {}),
  };
}

export function qimenShadowReadingGroupKey(reading: PreparedQimenShadowReading): string {
  return [
    reading.studyKey,
    reading.formalForecastKind,
    reading.formalForecastId,
    reading.formalForecastVersion,
    reading.horizon,
    reading.decisionAt,
    reading.evaluationDueAt,
  ].join("|");
}
