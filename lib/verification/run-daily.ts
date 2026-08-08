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
import { syncGeneratedDailyForecastsToVerificationStore } from "@/lib/verification/sync-generated-dailies";

export type RunDailyVerificationOptions = {
  forceRefetchForecastIds?: string[];
  now?: Date;
};

export type RunDailyVerificationReport = {
  syncedPublished: number;
  syncExisting: number;
  syncUnsupported: number;
  syncLatePublished: number;
  syncErrors: string[];
  scanned: number;
  verified: number;
  skippedExisting: number;
  voided: number;
  manualReview: number;
  finalizedUnverifiable: number;
  notReady: number;
  errors: string[];
};

const AUTO_UNVERIFIABLE_AFTER_MS = 72 * 60 * 60 * 1000;

function isAgedPastRetryWindow(forecastDate: string, now: Date): boolean {
  const start = new Date(`${forecastDate}T00:00:00+08:00`).getTime();
  return Number.isFinite(start) && now.getTime() - start >= AUTO_UNVERIFIABLE_AFTER_MS;
}

function buildAgedUnverifiableResult(
  forecast: DailyForecastRecord,
  reason: string,
  dataSource = "unavailable",
  now = new Date()
): DailyVerificationResult {
  const base = buildManualReviewResult(forecast, reason, dataSource);
  return {
    ...base,
    validationMode: "UNVERIFIABLE",
    verdict: "UNVERIFIABLE",
    verdictLabel: "无法验证",
    pathVerdict: "UNVERIFIABLE",
    pathVerdictLabel: "连续自动重试超过72小时，可靠行情仍不可用",
    validationExplanation:
      "系统已跨多个自动验证轮次重试，但仍无法取得足够可靠的行情证据。本条永久保留为不可验证，并从命中率分母中排除。",
    errorMessage: `自动重试超过72小时：${reason}`,
    verifiedAt: now.toISOString(),
  };
}

export async function runDailyVerification(
  options: RunDailyVerificationOptions = {}
): Promise<RunDailyVerificationReport> {
  const now = options.now ?? new Date();
  const force = new Set(options.forceRefetchForecastIds ?? []);

  // Bridge the canonical Prisma GeneratedDailyForecast store into the immutable
  // public verification store before each scan. This makes every locked/published
  // forecast auditable without relying on an administrator to duplicate it.
  const sync = await syncGeneratedDailyForecastsToVerificationStore({ now });
  const forecasts = await listDailyForecastRecords();
  const existing = await listDailyVerificationResults();
  const existingById = new Map(existing.map((r) => [r.forecastId, r]));

  const report: RunDailyVerificationReport = {
    syncedPublished: sync.created,
    syncExisting: sync.existing,
    syncUnsupported: sync.unsupported,
    syncLatePublished: sync.latePublished,
    syncErrors: sync.errors,
    scanned: 0,
    verified: 0,
    skippedExisting: 0,
    voided: 0,
    manualReview: 0,
    finalizedUnverifiable: 0,
    notReady: 0,
    errors: sync.errors.map((message) => `sync:${message}`),
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
      } else if (isAgedPastRetryWindow(forecast.forecastDate, now)) {
        result = buildAgedUnverifiableResult(forecast, market.error, "unavailable", now);
        report.finalizedUnverifiable += 1;
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

    if (result.verdict === "MANUAL_REVIEW" && isAgedPastRetryWindow(forecast.forecastDate, now)) {
      result = buildAgedUnverifiableResult(
        forecast,
        result.errorMessage ?? "自动验证连续失败",
        result.dataSource || "unavailable",
        now
      );
      report.manualReview = Math.max(0, report.manualReview - 1);
      report.finalizedUnverifiable += 1;
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
        if (
          isSessionReadyToVerify(forecast.market, forecast.forecastDate, now) &&
          isAgedPastRetryWindow(forecast.forecastDate, now)
        ) {
          const fallback = buildAgedUnverifiableResult(forecast, message, "unavailable", now);
          const priorResult = existingById.get(forecast.id);
          if (priorResult || force.has(forecast.id)) {
            await replaceDailyVerificationResult(fallback);
          } else {
            const { created } = await upsertDailyVerificationResult(fallback);
            if (!created) await replaceDailyVerificationResult(fallback);
          }
          await upsertDailyForecastRecord({ ...forecast, status: "verified" });
          report.finalizedUnverifiable += 1;
          continue;
        }
        if (forecast.status === "published") {
          await upsertDailyForecastRecord({ ...forecast, status: "verifying" });
        }
      } catch {
        // Keep the batch alive even when the fallback/status write also fails.
      }
    }
  }

  return report;
}
