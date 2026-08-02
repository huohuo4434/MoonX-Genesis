import "server-only";

import { getBeijingTodayKey } from "@/lib/calendar/beijing-date";
import { getBeijingClock } from "@/lib/calendar/publish-windows";
import { getEffectiveAutomationFlags } from "@/lib/automation/flags";
import { runDailyForecastPipeline } from "@/lib/forecasts/daily-pipeline";
import { generateReviewsForVerified } from "@/lib/automation/generate-reviews";
import { runDailyVerification } from "@/lib/verification/run-daily";
import {
  hasAutomationRunKey,
  listAutomationRuns,
  listDailyForecastRecords,
  listDailyReviews,
  listDailyVerificationResults,
  listLearningCases,
  recordAutomationRun,
} from "@/lib/data/moonx-data-store";

export type CycleReport = {
  at: string;
  beijingDate: string;
  tasks: Array<{ runKey: string; status: string; message?: string }>;
  forecastCreated?: number;
  verified?: number;
  reviewsCreated?: number;
  casesTotal?: number;
};

async function runOnce(
  runKey: string,
  task: string,
  fn: () => Promise<{ message: string; meta?: Record<string, unknown> }>
): Promise<{ runKey: string; status: string; message?: string }> {
  if (await hasAutomationRunKey(runKey)) {
    return { runKey, status: "skipped", message: "already succeeded" };
  }
  const startedAt = new Date().toISOString();
  try {
    const result = await fn();
    await recordAutomationRun({
      runKey,
      task,
      status: "success",
      message: result.message,
      startedAt,
      finishedAt: new Date().toISOString(),
      meta: result.meta,
    });
    return { runKey, status: "success", message: result.message };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await recordAutomationRun({
      runKey,
      task,
      status: "failed",
      message,
      startedAt,
      finishedAt: new Date().toISOString(),
    });
    return { runKey, status: "failed", message };
  }
}

export async function runMoonxCycle(now = new Date()): Promise<CycleReport> {
  const flags = await getEffectiveAutomationFlags();
  const today = getBeijingTodayKey(now);
  const clock = getBeijingClock(now);
  const report: CycleReport = { at: now.toISOString(), beijingDate: today, tasks: [] };

  if (flags.autoForecastEnabled) {
    const phase = flags.autoPublishEnabled ? "lock" : "draft";
    const task = await runOnce(`forecast-unified-${today}-${phase}`, "generate-unified", async () => {
      const result = await runDailyForecastPipeline({ now, forcePhase: phase });
      if (result.errors.length) {
        throw new Error(result.errors.map((item) => `${item.market}:${item.date ?? "-"}:${item.error}`).join("；"));
      }
      return {
        message: `upserted=${result.upserted.length} skipped=${result.skipped.length} warnings=${result.warnings.length} errors=${result.errors.length}`,
        meta: {
          phase: result.phase,
          upserted: result.upserted.length,
          skipped: result.skipped.length,
          warnings: result.warnings,
          errors: result.errors,
        },
      };
    });
    report.tasks.push(task);
    report.forecastCreated = Number(task.message?.match(/upserted=(\d+)/)?.[1] ?? 0);
  } else {
    report.forecastCreated = 0;
  }

  if (flags.autoVerifyEnabled) {
    const runKey = `verify-scan-${today}-${String(clock.hour).padStart(2, "0")}`;
    const task = await runOnce(runKey, "verify-daily", async () => {
      const result = await runDailyVerification({ now });
      return {
        message: `verified=${result.verified} voided=${result.voided} manual=${result.manualReview} skipped=${result.skippedExisting}`,
        meta: { ...result },
      };
    });
    report.tasks.push(task);
    report.verified = Number(task.message?.match(/verified=(\d+)/)?.[1] ?? 0);
  }

  if (flags.autoReviewEnabled || flags.autoLearningEnabled) {
    const runKey = `review-scan-${today}-${String(clock.hour).padStart(2, "0")}`;
    const task = await runOnce(runKey, "generate-reviews", async () => {
      const result = await generateReviewsForVerified(now);
      return { message: `reviews=${result.created} skipped=${result.skipped}`, meta: { ...result } };
    });
    report.tasks.push(task);
    report.reviewsCreated = Number(task.message?.match(/reviews=(\d+)/)?.[1] ?? 0);
  }

  report.casesTotal = (await listLearningCases()).length;
  report.tasks.push({
    runKey: `roll-public-${today}`,
    status: "success",
    message: "public today unlocks at Beijing 08:00 via forecastDate",
  });

  return report;
}

export async function getAutomationDashboard() {
  const [settingsFlags, runs, forecasts, results, reviews, cases] = await Promise.all([
    getEffectiveAutomationFlags(),
    listAutomationRuns(),
    listDailyForecastRecords(),
    listDailyVerificationResults(),
    listDailyReviews(),
    listLearningCases(),
  ]);
  const last = runs[0] ?? null;
  const failed = runs.filter((row) => row.status === "failed").slice(0, 20);
  const today = getBeijingTodayKey();

  const assetStatus = forecasts
    .filter((forecast) => forecast.forecastDate >= today)
    .map((forecast) => ({
      assetName: forecast.assetName,
      symbol: forecast.symbol,
      forecastDate: forecast.forecastDate,
      generated: true,
      published:
        forecast.status === "published" ||
        forecast.status === "verifying" ||
        forecast.status === "verified",
      verified: results.some((result) => result.forecastId === forecast.id),
      failReason: results.find(
        (result) => result.forecastId === forecast.id && result.verdict === "MANUAL_REVIEW"
      )?.errorMessage,
    }));

  return {
    flags: settingsFlags,
    lastRun: last,
    failed,
    counts: {
      forecasts: forecasts.length,
      verifications: results.length,
      reviews: reviews.length,
      cases: cases.length,
      todayForecasts: forecasts.filter((forecast) => forecast.forecastDate === today).length,
      tomorrowForecasts: forecasts.filter((forecast) => forecast.forecastDate > today).length,
    },
    nextForecastWindow: "北京时间20:00统一锁定九个核心市场的今日与下一交易日预测",
    nextVerifyWindow: "今日公开转换：北京08:00；各市场收盘后自动验证",
    publishSchedule: {
      formal: "北京时间20:00统一生成并锁定",
      publicFlip: "普通用户今日观点08:00开放",
    },
    assetStatus,
  };
}
