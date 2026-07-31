import "server-only";

import { getBeijingTodayKey, getBeijingTomorrowKey } from "@/lib/calendar/beijing-date";
import { asiaBatchReady, getBeijingClock, usBatchReady, wtiBatchReady } from "@/lib/calendar/publish-windows";
import { getEffectiveAutomationFlags } from "@/lib/automation/flags";
import { generateForecastBatch } from "@/lib/automation/generate-forecasts";
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
  const tomorrow = getBeijingTomorrowKey(now);
  const clock = getBeijingClock(now);
  const report: CycleReport = { at: now.toISOString(), beijingDate: today, tasks: [] };
  let forecastCreated = 0;

  if (flags.autoForecastEnabled && asiaBatchReady(now)) {
    const runKey = `forecast-asia-${tomorrow}`;
    const task = await runOnce(runKey, "generate-asia", async () => {
      const r = await generateForecastBatch("asia", now);
      return { message: `created=${r.created} skipped=${r.skipped}`, meta: { ...r, batch: "asia" } };
    });
    report.tasks.push(task);
    forecastCreated += Number(task.message?.match(/created=(\d+)/)?.[1] ?? 0);
  }

  if (flags.autoForecastEnabled && wtiBatchReady(now)) {
    const runKey = `forecast-wti-${today}`;
    const task = await runOnce(runKey, "generate-wti", async () => {
      const r = await generateForecastBatch("wti", now);
      return { message: `created=${r.created} skipped=${r.skipped}`, meta: { ...r, batch: "wti" } };
    });
    report.tasks.push(task);
    forecastCreated += Number(task.message?.match(/created=(\d+)/)?.[1] ?? 0);
  }

  if (flags.autoForecastEnabled && usBatchReady(now)) {
    const runKey = `forecast-us-${today}`;
    const task = await runOnce(runKey, "generate-us", async () => {
      const r = await generateForecastBatch("us", now);
      return { message: `created=${r.created} skipped=${r.skipped}`, meta: { ...r, batch: "us" } };
    });
    report.tasks.push(task);
    forecastCreated += Number(task.message?.match(/created=(\d+)/)?.[1] ?? 0);
  }
  report.forecastCreated = forecastCreated;

  if (flags.autoVerifyEnabled) {
    const runKey = `verify-scan-${today}-${String(clock.hour).padStart(2, "0")}`;
    const task = await runOnce(runKey, "verify-daily", async () => {
      const r = await runDailyVerification({ now });
      return {
        message: `verified=${r.verified} voided=${r.voided} manual=${r.manualReview} skipped=${r.skippedExisting}`,
        meta: { ...r },
      };
    });
    report.tasks.push(task);
    report.verified = Number(task.message?.match(/verified=(\d+)/)?.[1] ?? 0);
  }

  if (flags.autoReviewEnabled || flags.autoLearningEnabled) {
    const runKey = `review-scan-${today}-${String(clock.hour).padStart(2, "0")}`;
    const task = await runOnce(runKey, "generate-reviews", async () => {
      const r = await generateReviewsForVerified(now);
      return { message: `reviews=${r.created} skipped=${r.skipped}`, meta: { ...r } };
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
  const failed = runs.filter((r) => r.status === "failed").slice(0, 20);
  const today = getBeijingTodayKey();

  const assetStatus = forecasts
    .filter((f) => f.forecastDate >= today)
    .map((f) => ({
      assetName: f.assetName,
      symbol: f.symbol,
      forecastDate: f.forecastDate,
      generated: true,
      published: f.status === "published" || f.status === "verifying" || f.status === "verified",
      verified: results.some((r) => r.forecastId === f.id),
      failReason: results.find((r) => r.forecastId === f.id && r.verdict === "MANUAL_REVIEW")?.errorMessage,
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
      todayForecasts: forecasts.filter((f) => f.forecastDate === today).length,
      tomorrowForecasts: forecasts.filter((f) => f.forecastDate > today).length,
    },
    nextForecastWindow: "全天自动生成今日与下一交易日预测；管理员仅作必要修正",
    nextVerifyWindow: "今日公开转换：北京 08:00；收盘后自动验证",
    publishSchedule: {
      asia: "自动更新",
      us: "自动更新",
      wti: "自动更新",
      formal: "自动发布",
      publicFlip: "普通用户今日观点08:00开放",
    },
    assetStatus,
  };
}
