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
import { selectCanonicalDailyForecasts } from "@/lib/accuracy/public-history-filter";
import { isAuditableCryptoBeijingV2Result } from "@/lib/verification/crypto-beijing-v2-candidates";

export type RunDailyVerificationOptions = {
  forceRefetchForecastIds?: string[];
  now?: Date;
  /** Explicit scope; [] means no work, never a full scan. Scoped runs do not sync or generate reviews. */
  forecastIds?: string[];
  cryptoBeijingMigration?: boolean;
  maxRecords?: number;
  deadlineAt?: number;
};

export type RunDailyVerificationReport = {
  syncedPublished: number;
  syncExisting: number;
  syncUnsupported: number;
  syncLatePublished: number;
  syncErrors: string[];
  focusSyncedPublished: number;
  focusSyncExisting: number;
  focusSyncUnsupported: number;
  focusSyncErrors: string[];
  scanned: number;
  verified: number;
  skippedExisting: number;
  voided: number;
  manualReview: number;
  finalizedUnverifiable: number;
  reopenedLegacyVoid: number;
  notReady: number;
  errors: string[];
  reviewsCreated: number;
  focusDeferred: number;
  deferred: number;
  attempted: number;
  preservedPrior: number;
  writeOutcomeUnknown: number;
  syncDeferred: number;
  reviewsDeferred: number;
};

const AUTO_UNVERIFIABLE_AFTER_MS = 72 * 60 * 60 * 1000;

function shouldReopenLegacyVoid(
  forecast: DailyForecastRecord,
  prior: DailyVerificationResult | undefined
): boolean {
  if (!prior || prior.verdict !== "VOID") return false;
  if (forecast.isSystemTest) return false;
  if (!isPublishedBeforeCutoff(forecast)) return false;
  const reason = `${prior.errorMessage ?? ""} ${prior.pathVerdictLabel ?? ""}`;
  if (/休市|market\s*closed|系统测试|system\s*test/i.test(reason)) return false;
  return true;
}

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
  const scope = options.forecastIds === undefined ? null : new Set(options.forecastIds);
  // Cooperative cutoff: finish an in-flight record; never return while writes are still running.
  const deadlineAt = options.deadlineAt ?? Date.now() + 180_000;
  const maxRecords = Math.max(0, Math.min(8, Math.floor(options.maxRecords ?? 8)));
  const migration = options.cryptoBeijingMigration === true;
  if (migration && scope === null) throw new Error("Migration requires explicit forecastIds");

  // Bridge the canonical Prisma GeneratedDailyForecast store into the immutable
  // public verification store before each scan. This makes every locked/published
  // forecast auditable without relying on an administrator to duplicate it.
  const syncDeadline = Math.min(deadlineAt, Date.now() + 45_000);
  const sync = scope !== null ? { created: 0, existing: 0, unsupported: 0, latePublished: 0, errors: [] as string[], deferred: 0 }
    : await syncGeneratedDailyForecastsToVerificationStore({ now, maxRecords: 12, deadlineAt: syncDeadline });
  const focusSync = scope !== null ? { created: 0, existing: 0, unsupported: 0, errors: [] as string[], deferred: 0 }
    : await (await import("@/lib/verification/sync-focus-generated-dailies")).syncFocusGeneratedDailiesToVerificationStore(now, { maxRecords: 12, deadlineAt: syncDeadline });
  const forecasts = await listDailyForecastRecords();
  const existing = await listDailyVerificationResults();
  const existingById = new Map(existing.map((r) => [r.forecastId, r]));

  const report: RunDailyVerificationReport = {
    syncedPublished: sync.created,
    syncExisting: sync.existing,
    syncUnsupported: sync.unsupported,
    syncLatePublished: sync.latePublished,
    syncErrors: sync.errors,
    focusSyncedPublished: focusSync.created,
    focusSyncExisting: focusSync.existing,
    focusSyncUnsupported: focusSync.unsupported,
    focusSyncErrors: focusSync.errors,
    scanned: 0,
    verified: 0,
    skippedExisting: 0,
    voided: 0,
    manualReview: 0,
    finalizedUnverifiable: 0,
    reopenedLegacyVoid: 0,
    notReady: 0,
    errors: [
      ...sync.errors.map((message) => `sync:${message}`),
      ...focusSync.errors.map((message) => `focus-sync:${message}`),
    ],
    reviewsCreated: 0,
    focusDeferred: 0,
    deferred: 0,
    attempted: 0,
    preservedPrior: 0,
    writeOutcomeUnknown: 0,
    syncDeferred: sync.deferred + focusSync.deferred,
    reviewsDeferred: 0,
  };

  const canonicalMemberIds = new Set(
    selectCanonicalDailyForecasts(forecasts.filter((forecast) => forecast.visibility === "MEMBER"))
      .map((forecast) => forecast.id)
  );
  const candidates = forecasts.filter(
    (f) =>
      (scope === null || scope.has(f.id)) &&
      (f.status === "published" ||
        f.status === "verifying" ||
        f.status === "verified" ||
        f.status === "invalid") &&
      (migration || f.visibility !== "MEMBER" || canonicalMemberIds.has(f.id))
  ).sort((a, b) => (existingById.get(a.id)?.verifiedAt ?? "").localeCompare(existingById.get(b.id)?.verifiedAt ?? "") || a.forecastDate.localeCompare(b.forecastDate) || a.id.localeCompare(b.id));
  const readyMemberIds = new Set(
    candidates
      .filter((forecast) => forecast.visibility === "MEMBER")
      .filter((forecast) => {
        const prior = existingById.get(forecast.id);
        return !prior || !["HIT", "FULL_HIT", "PARTIAL_HIT", "MISS", "UNVERIFIABLE", "VOID"].includes(prior.verdict);
      })
      .filter((forecast) => force.has(forecast.id) || isSessionReadyToVerify(forecast.market, forecast.forecastDate, now))
      .slice(0, 6)
      .map((forecast) => forecast.id)
  );

  for (let forecast of candidates) {
    report.scanned += 1;
    let resultWriteStarted = false;
    try {

    const prior = existingById.get(forecast.id);
    const reopenLegacyVoid = shouldReopenLegacyVoid(forecast, prior);
    if (prior && ["HIT", "FULL_HIT", "PARTIAL_HIT", "MISS", "UNVERIFIABLE", "VOID"].includes(prior.verdict) && !reopenLegacyVoid && !force.has(forecast.id)) {
      report.skippedExisting += 1;
      continue;
    }
    if (migration && (!prior || forecast.market !== "CRYPTO" || !["HIT", "FULL_HIT", "PARTIAL_HIT", "MISS"].includes(prior.verdict) ||
      !isPublishedBeforeCutoff(forecast) || forecast.status === "invalid" || forecast.isSystemTest ||
      !isSessionReadyToVerify(forecast.market, forecast.forecastDate, now))) {
      report.preservedPrior += 1;
      continue;
    }
    if (!isSessionReadyToVerify(forecast.market, forecast.forecastDate, now) && !force.has(forecast.id)) {
      report.notReady += 1;
      continue;
    }
    if (report.attempted >= maxRecords || Date.now() >= deadlineAt) {
      report.deferred += 1;
      continue;
    }

    if (
      forecast.visibility === "MEMBER" &&
      isSessionReadyToVerify(forecast.market, forecast.forecastDate, now) &&
      !readyMemberIds.has(forecast.id) &&
      !force.has(forecast.id)
    ) {
      report.focusDeferred += 1;
      continue;
    }

    report.attempted += 1;
    if (reopenLegacyVoid && forecast.status === "invalid") {
      forecast = { ...forecast, status: "verifying" };
      await upsertDailyForecastRecord(forecast);
    }

    if (!isPublishedBeforeCutoff(forecast) || forecast.status === "invalid") {
      await upsertDailyForecastRecord({ ...forecast, status: "invalid" });
      const voidResult = buildVoidResult(forecast, "发布时间超过截止时间，不计入准确率");
      if (force.has(forecast.id) || !existingById.get(forecast.id) || existingById.get(forecast.id)?.verdict === "MANUAL_REVIEW") {
        await replaceDailyVerificationResult(voidResult);
        if (!migration) report.voided += 1;
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

    const quoteSymbol = resolveCanonicalQuoteSymbol(forecast.symbol, forecast.quoteSymbol);
    if (forecast.quoteSymbol !== quoteSymbol) {
      if (!migration) await upsertDailyForecastRecord({ ...forecast, quoteSymbol });
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
        if (!migration) report.voided += 1;
      } else if (isAgedPastRetryWindow(forecast.forecastDate, now)) {
        result = buildAgedUnverifiableResult(forecast, market.error, "unavailable", now);
        if (!migration) report.finalizedUnverifiable += 1;
      } else {
        result = buildManualReviewResult(forecast, market.error, "unavailable");
        if (!migration) report.manualReview += 1;
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
      if (!migration) report.manualReview += 1;
    } else if (
      (forecast.symbol === "WTI" || forecast.market === "US_FUTURES") &&
      looksLikeFuturesRoll(market.previousClose, market.open, market.close)
    ) {
      result = buildManualReviewResult(forecast, "疑似连续合约换月影响", market.dataSource);
      if (!migration) report.manualReview += 1;
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
      if (!migration) report.voided += 1;
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
    }

    if (result.verdict === "MANUAL_REVIEW" && isAgedPastRetryWindow(forecast.forecastDate, now)) {
      result = buildAgedUnverifiableResult(
        forecast,
        result.errorMessage ?? "自动验证连续失败",
        result.dataSource || "unavailable",
        now
      );
      if (!migration) {
        report.manualReview = Math.max(0, report.manualReview - 1);
        report.finalizedUnverifiable += 1;
      }
    }

    if (reopenLegacyVoid && result.verdict !== "VOID" && result.verdict !== "MANUAL_REVIEW") {
      result = {
        ...result,
        validationExplanation: [
          "历史不计分状态经现行发布截止规则复核后自动重新验证；原预测内容与发布时间均未修改。",
          result.validationExplanation,
        ]
          .filter(Boolean)
          .join(" "),
      };
      report.reopenedLegacyVoid += 1;
    }

    if (migration && !isAuditableCryptoBeijingV2Result(result)) {
      report.preservedPrior += 1;
      continue;
    }
    resultWriteStarted = true;
    if (prior || force.has(forecast.id)) {
      await replaceDailyVerificationResult(result);
    } else {
      const { created } = await upsertDailyVerificationResult(result);
      if (!created) {
        await replaceDailyVerificationResult(result);
      }
    }

    if (["HIT", "FULL_HIT", "PARTIAL_HIT", "MISS"].includes(result.verdict)) report.verified += 1;
    if (!migration) await upsertDailyForecastRecord({
      ...forecast,
      status: result.verdict === "MANUAL_REVIEW" ? "verifying" : "verified",
    } satisfies DailyForecastRecord);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      report.errors.push(`${forecast.symbol}:${forecast.forecastDate}:${message}`);
      if (resultWriteStarted) {
        // Storage writes primary + alias. A rejection may follow a partial commit;
        // never claim restoration or overwrite an uncertain write with a fallback.
        report.writeOutcomeUnknown += 1;
        continue;
      }
      if (migration) {
        report.preservedPrior += 1;
        continue;
      }
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

  if (scope === null) try {
    const { generateReviewsForVerified } = await import("@/lib/automation/generate-reviews");
    const reviews = await generateReviewsForVerified(now, { maxRecords: 4, deadlineAt });
    report.reviewsCreated = reviews.created;
    report.reviewsDeferred = reviews.deferred;
  } catch (error) {
    report.errors.push(`review-generation:${error instanceof Error ? error.message : String(error)}`);
  }

  return report;
}
