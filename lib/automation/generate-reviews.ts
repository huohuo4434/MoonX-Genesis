import "server-only";

import {
  listDailyForecastRecords,
  listDailyVerificationResults,
  upsertDailyReview,
  upsertLearningCase,
} from "@/lib/data/moonx-data-store";
import { inferBiasesFromMiss, buildSimilarCaseKey } from "@/lib/automation/learning";
import { recordTeacherLearningFeedback } from "@/lib/teacher-voice-learning/feedback";
import type { DailyReviewRecord, PathVerdict } from "@/types/automation";
import { PATH_VERDICT_LABELS } from "@/types/automation";
import type { DailyVerificationResult } from "@/types/daily-accuracy";

function pathFromDailyBars(result: DailyVerificationResult): PathVerdict {
  if (result.actualPattern === "UP_THEN_DOWN" || result.actualPattern === "SURGE_THEN_PULLBACK") {
    return "FIRST_UP_THEN_DOWN";
  }
  if (result.actualPattern === "DOWN_THEN_UP" || result.actualPattern === "DIP_THEN_RECOVERY") {
    return "FIRST_DOWN_THEN_UP";
  }
  if (result.actualPattern === "UP" || result.actualPattern === "RANGE_UP") return "TREND_UP";
  if (result.actualPattern === "DOWN" || result.actualPattern === "RANGE_DOWN") return "TREND_DOWN";
  if (result.actualPattern === "RANGE") return "NARROW_RANGE";
  if (result.actualOpen == null || result.actualHigh == null || result.actualLow == null || !result.actualClose) {
    return "INSUFFICIENT_DATA";
  }
  const rangePct = result.previousClose > 0
    ? ((result.actualHigh - result.actualLow) / result.previousClose) * 100
    : 0;
  if (rangePct < 0.4) return "NARROW_RANGE";
  if (rangePct > 2.5) return "WIDE_RANGE";
  return "INSUFFICIENT_DATA";
}

export async function generateReviewsForVerified(now = new Date()): Promise<{ created: number; skipped: number }> {
  const [forecasts, results] = await Promise.all([
    listDailyForecastRecords(),
    listDailyVerificationResults(),
  ]);
  const byId = new Map(forecasts.map((f) => [f.id, f]));
  let created = 0;
  let skipped = 0;

  for (const result of results) {
    if (!["HIT", "FULL_HIT", "PARTIAL_HIT", "MISS"].includes(result.verdict)) {
      skipped += 1;
      continue;
    }
    const forecast = byId.get(result.forecastId);
    if (!forecast) {
      skipped += 1;
      continue;
    }

    const isFullHit = result.verdict === "HIT" || result.verdict === "FULL_HIT";
    const isPartial = result.verdict === "PARTIAL_HIT";
    const isMiss = result.verdict === "MISS";
    const pathVerdict = pathFromDailyBars(result);
    const biases =
      isMiss
        ? inferBiasesFromMiss({
            predicted: forecast.direction,
            actual: result.actualDirection,
            sourceType: forecast.source?.includes("周期") || forecast.source?.includes("内部")
              ? "cycle_derivation"
              : undefined,
            confidence: forecast.probability,
          })
        : [];
    if (
      isMiss &&
      !forecast.sourcePrimaryHexagram &&
      !biases.some((bias) => bias.code === "insufficient_evidence")
    ) {
      biases.push({
        code: "insufficient_evidence",
        severity: 2,
        evidence: "锁定记录缺少可直接展示的本周卦象结构，偏差归因只能停留在方向和路径层。",
      });
    }

    let whatWasCorrect =
      isFullHit
        ? `预测走势${forecast.predictedPatternLabel ?? forecast.directionLabel ?? forecast.direction}与实际走势${result.actualPatternLabel ?? result.actualDirection}一致。`
        : isPartial
          ? `主要方向或路径接近，但实际走势${result.actualPatternLabel ?? result.actualDirection}与原预测并非完全一致。`
          : "主要方向或运行顺序未命中。";
    let whatWasWrong =
      isMiss
        ? `实际走势为${result.actualPatternLabel ?? result.actualDirection}（${result.actualReturnPct.toFixed(2)}%），与预测明显不一致。`
        : isPartial
          ? "方向族接近，但路径等级、反转强弱或收盘位置存在偏差。"
          : "完全命中仍需检查支撑压力和确认失效条件是否同步成立。";
    let lessonSummary =
      isFullHit
        ? "保留该结构下的方向与路径框架，同时继续核对支撑压力反应。"
        : isPartial
          ? "方向判断可保留，但需要收紧路径定义，区分普通反转与冲高回落、探底回升。"
          : biases[0]?.evidence ?? "优先检查时间拆解与旺衰解读，而不是简单断言卦象错误。";
    let futureCaution =
      biases.find((b) => b.code === "overprecise_daily_timing")?.evidence ??
      "下次遇到相似结构时，先确认用神与世应，再做日度方向，不机械反向。";

    if (result.symbol === "SPX") {
      whatWasCorrect =
        isFullHit
          ? "标普指数收盘方向命中；需同时核对是否错误照搬纳指、以及市场宽度是否被忽略。"
          : whatWasCorrect;
      whatWasWrong =
        isMiss
          ? `${whatWasWrong} 复盘重点：是否照搬纳指、市场宽度是否被忽略、科技与非科技权重是否分化。`
          : whatWasWrong;
      lessonSummary =
        isFullHit
          ? "标普命中时仍要区分宽度与科技权重贡献，避免下次默认复制纳指。"
          : "标普未命中时优先检查宽度与非科技权重，而不是直接用纳指方向解释。";
      futureCaution = "标普与纳指允许分化；宽度恶化时不得因科技反弹而强行看多标普。";
    }

    if (result.symbol === "WTI") {
      whatWasCorrect =
        isFullHit
          ? "WTI收盘方向命中；仍需核对库存/供需、地缘与连续合约换月是否造成干扰。"
          : whatWasCorrect;
      whatWasWrong =
        isMiss
          ? `${whatWasWrong} 复盘重点：库存或供需是否覆盖技术结构、地缘突发、连续合约换月、是否过度依赖长期原油卦、高波动是否被误读为收盘方向。`
          : whatWasWrong;
      lessonSummary =
        isFullHit
          ? "WTI命中时仍要区分短线技术结构与长期原油路径，避免把日内高波动写成收盘必然。"
          : "WTI未命中时优先核对库存/美元/地缘与换月断层，而不是机械坚持长期原油目标。";
      futureCaution = "换月或异常跳空进入人工复核；不得用布伦特口径验证WTI。";
    }

    const review: DailyReviewRecord = {
      id: `review-${result.forecastId}`,
      forecastId: result.forecastId,
      assetName: result.assetName,
      symbol: result.symbol,
      forecastDate: result.forecastDate,
      originalForecast: {
        direction: forecast.direction,
        directionLabel: forecast.directionLabel,
        confidence: forecast.probability,
        summary: forecast.summary,
        expectedPath: forecast.expectedPath,
        sourceForecastId: forecast.sourceForecastId,
        sourcePeriodStart: forecast.sourcePeriodStart,
        sourcePeriodEnd: forecast.sourcePeriodEnd,
        primaryHexagram: forecast.sourcePrimaryHexagram,
        changedHexagram: forecast.sourceChangedHexagram,
        sourceInterpretation: forecast.sourceInterpretation,
        weeklyDirection: forecast.sourceWeeklyDirection,
        version: forecast.originalVersion,
      },
      actualResult: {
        returnPct: result.actualReturnPct,
        actualDirection: result.actualDirection,
        close: result.actualClose,
        previousClose: result.previousClose,
        open: result.actualOpen,
        high: result.actualHigh,
        low: result.actualLow,
        actualPattern: result.actualPatternLabel ?? result.actualPattern ?? null,
        mainHighTime: result.mainHighTime,
        mainLowTime: result.mainLowTime,
      },
      directionVerdict: result.verdict,
      pathVerdict,
      pathVerdictLabel: PATH_VERDICT_LABELS[pathVerdict],
      whatWasCorrect,
      whatWasWrong,
      interpretationBiases: biases,
      marketOverrides: [],
      lessonSummary,
      futureCaution,
      confidenceAdjustment: isMiss ? -3 : isPartial ? 0 : 1,
      similarCaseKey: buildSimilarCaseKey({
        assetClass: forecast.market,
        horizon: "daily",
        direction: forecast.direction,
        marketRegime: pathVerdict,
        structures: biases.map((b) => b.code),
      }),
      createdAt: now.toISOString(),
    };

    const { created: ok } = await upsertDailyReview(review);
    if (!ok) {
      skipped += 1;
      continue;
    }
    created += 1;

    await upsertLearningCase({
      id: `case-${result.forecastId}`,
      assetClass: forecast.market,
      assetName: forecast.assetName,
      horizon: "daily",
      keyStructures: biases.map((b) => b.code),
      marketRegime: pathVerdict,
      forecastDirection: forecast.direction,
      actualDirection: result.actualDirection,
      verdict: result.verdict,
      interpretationBiases: biases,
      lessonSummary: review.lessonSummary,
      futureCaution: review.futureCaution,
      confidenceAdjustment: review.confidenceAdjustment,
      similarCaseKey: review.similarCaseKey,
      createdAt: now.toISOString(),
    });

    try {
      await recordTeacherLearningFeedback({
        assetId: result.symbol,
        query: `${result.assetName} ${result.symbol} ${result.forecastDate}`.trim(),
        prediction: `${forecast.directionLabel ?? forecast.direction} · ${forecast.summary ?? ""}`.trim(),
        actual: `${result.actualDirection} · ${result.actualReturnPct.toFixed(2)}%`,
        correct: isFullHit,
      });
    } catch {
      // Voice-learning feedback must not block daily review pipeline.
    }
  }

  return { created, skipped };
}
