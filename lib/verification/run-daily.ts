import "server-only";

import {
  listDailyForecastRecords,
  listDailyVerificationResults,
  replaceDailyVerificationResult,
  upsertDailyForecastRecord,
  upsertDailyVerificationResult,
} from "@/lib/data/daily-accuracy-store";
import {
  fetchIntradayBarsForVerification,
  fetchRecentDailyBarsForForecast,
  getDailyMarketResult,
} from "@/lib/market-data/daily-prices";
import { computeAtrPct } from "@/lib/verification/pattern-classifier";
import {
  resolveCanonicalQuoteSymbol,
  quoteSanityFailure,
} from "@/lib/market-data/quote-symbols";
import { isSessionReadyToVerify } from "@/lib/verification/session-ready";
import {
  buildHitMissResult,
  buildManualReviewResult,
  buildVoidResult,
  isPublishedBeforeCutoff,
  looksLikeFuturesRoll,
} from "@/lib/verification/daily-rules";
import type { DailyForecastRecord, DailyVerificationResult } from "@/types/daily-accuracy";

export type RunDailyVerificationOptions = {
  forceRefetchForecastIds?: string[];
  now?: Date;
};

export type RunDailyVerificationReport = {
  scanned: number;
  verified: number;
  skippedExisting: number;
  voided: number;
  manualReview: number;
  notReady: number;
  errors: string[];
};

export async function runDailyVerification(
  options: RunDailyVerificationOptions = {}
): Promise<RunDailyVerificationReport> {
  const now = options.now ?? new Date();
  const force = new Set(options.forceRefetchForecastIds ?? []);
  const forecasts = await listDailyForecastRecords();
  const existing = await listDailyVerificationResults();
  const existingById = new Map(existing.map((r) => [r.forecastId, r]));

  const report: RunDailyVerificationReport = {
    scanned: 0,
    verified: 0,
    skippedExisting: 0,
    voided: 0,
    manualReview: 0,
    notReady: 0,
    errors: [],
  };

  const candidates = forecasts.filter(
    (f) =>
      f.status === "published" ||
      f.status === "verifying" ||
      f.status === "verified" ||
      f.status === "invalid"
  );

  for (let forecast of candidates) {
    report.scanned += 1;
    try {

    if (!isPublishedBeforeCutoff(forecast) || forecast.status === "invalid") {
      await upsertDailyForecastRecord({ ...forecast, status: "invalid" });
      const voidResult = buildVoidResult(forecast, "发布时间超过截止时间，不计入准确率");
      if (force.has(forecast.id) || !existingById.get(forecast.id) || existingById.get(forecast.id)?.verdict === "MANUAL_REVIEW") {
        await replaceDailyVerificationResult(voidResult);
        report.voided += 1;
      } else {
        const priorVoid = existingById.get(forecast.id);
        if (priorVoid?.verdict === "VOID") {
          report.skippedExisting += 1;
        } else {
          await replaceDailyVerificationResult(voidResult);
          report.voided += 1;
        }
      }
      continue;
    }

    const prior = existingById.get(forecast.id);
    const locked =
      prior &&
      (["HIT", "FULL_HIT", "PARTIAL_HIT", "MISS", "UNVERIFIABLE", "VOID"].includes(prior.verdict)) &&
      !force.has(forecast.id);

    if (locked) {
      report.skippedExisting += 1;
      continue;
    }

    if (!isSessionReadyToVerify(forecast.market, forecast.forecastDate, now) && !force.has(forecast.id)) {
      if (forecast.status === "published") {
        await upsertDailyForecastRecord({ ...forecast, status: "verifying" });
      }
      report.notReady += 1;
      continue;
    }

    const quoteSymbol = resolveCanonicalQuoteSymbol(forecast.symbol, forecast.quoteSymbol);
    if (forecast.quoteSymbol !== quoteSymbol) {
      await upsertDailyForecastRecord({ ...forecast, quoteSymbol });
      forecast = { ...forecast, quoteSymbol };
    }

    const market = await getDailyMarketResult({
      symbol: forecast.symbol,
      quoteSymbol,
      market: forecast.market,
      forecastDate: forecast.forecastDate,
    });

    let intradayBars: Awaited<ReturnType<typeof fetchIntradayBarsForVerification>> = [];
    let atrPct: number | null = null;
    if (!("error" in market)) {
      try {
        [intradayBars, atrPct] = await Promise.all([
          fetchIntradayBarsForVerification({
            symbol: forecast.symbol,
            quoteSymbol,
            market: forecast.market,
            forecastDate: forecast.forecastDate,
          }).catch(() => []),
          fetchRecentDailyBarsForForecast({
            quoteSymbol,
            market: forecast.market,
            asOfDate: forecast.forecastDate,
          })
            .then((bars) => computeAtrPct(bars))
            .catch(() => null),
        ]);
      } catch {
        intradayBars = [];
        atrPct = null;
      }
    }

    let result: DailyVerificationResult;
    if ("error" in market) {
      if (market.marketClosed) {
        result = buildVoidResult(forecast, "休市，不计入准确率", "calendar");
        report.voided += 1;
      } else {
        result = buildManualReviewResult(forecast, market.error, "unavailable");
        report.manualReview += 1;
      }
    } else if (
      quoteSanityFailure({
        symbol: forecast.symbol,
        quoteSymbol,
        close: market.close,
        previousClose: market.previousClose,
        high: market.high,
        low: market.low,
      })
    ) {
      result = buildManualReviewResult(
        forecast,
        "疑似标的或价格缩放错误",
        market.dataSource
      );
      report.manualReview += 1;
    } else if (
      (forecast.symbol === "WTI" || forecast.market === "US_FUTURES") &&
      looksLikeFuturesRoll(market.previousClose, market.open, market.close)
    ) {
      result = buildManualReviewResult(forecast, "疑似连续合约换月影响", market.dataSource);
      report.manualReview += 1;
    } else if (forecast.isSystemTest) {
      result = {
        ...buildHitMissResult({
          record: forecast,
          previousClose: market.previousClose,
          actualOpen: market.open,
          actualHigh: market.high,
          actualLow: market.low,
          actualClose: market.close,
          dataSource: market.dataSource,
          intradayBars,
          atrPct,
        }),
        verdict: "VOID",
        verdictLabel: "不计入统计",
        errorMessage: "系统测试，不计入准确率",
      };
      report.voided += 1;
    } else {
      result = buildHitMissResult({
        record: forecast,
        previousClose: market.previousClose,
        actualOpen: market.open,
        actualHigh: market.high,
        actualLow: market.low,
        actualClose: market.close,
        dataSource: market.dataSource,
        intradayBars,
        atrPct,
      });
      report.verified += 1;
    }

    if (prior || force.has(forecast.id)) {
      await replaceDailyVerificationResult(result);
    } else {
      const { created } = await upsertDailyVerificationResult(result);
      if (!created) {
        await replaceDailyVerificationResult(result);
      }
    }

    await upsertDailyForecastRecord({
      ...forecast,
      status: result.verdict === "MANUAL_REVIEW" ? "verifying" : "verified",
    } satisfies DailyForecastRecord);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      report.errors.push(`${forecast.symbol}:${forecast.forecastDate}:${message}`);
      try {
        if (forecast.status === "published") {
          await upsertDailyForecastRecord({ ...forecast, status: "verifying" });
        }
      } catch {
        // Keep the batch alive even when the status write also fails.
      }
    }
  }

  return report;
}
