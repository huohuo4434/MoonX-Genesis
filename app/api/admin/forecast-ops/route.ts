import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/permissions";
import { getBeijingBusinessDate, getBeijingTomorrowKey } from "@/lib/calendar/beijing-date";
import { getBeijingClock } from "@/lib/calendar/publish-windows";
import { getPublicTodayForecasts, getTomorrowCoreForecasts } from "@/lib/data/daily-forecasts";
import { listDailyForecastRecords } from "@/lib/data/moonx-data-store";
import { listAutomationRuns } from "@/lib/data/moonx-data-store";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "无权限" }, { status: 403 });
  const now = new Date();
  const today = getBeijingBusinessDate(now);
  const tomorrow = getBeijingTomorrowKey(now);
  const clock = getBeijingClock(now);
  const curatedToday = getPublicTodayForecasts(now);
  const curatedTomorrow = getTomorrowCoreForecasts(now);
  let storeRecords: Awaited<ReturnType<typeof listDailyForecastRecords>> = [];
  let runs: Awaited<ReturnType<typeof listAutomationRuns>> = [];
  try {
    storeRecords = await listDailyForecastRecords();
  } catch {
    storeRecords = [];
  }
  try {
    runs = await listAutomationRuns();
  } catch {
    runs = [];
  }
  const latestRun = [...runs].sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0] ?? null;
  const storeToday = storeRecords.filter((r) => r.forecastDate === today);
  const storeTomorrow = storeRecords.filter((r) => r.forecastDate === tomorrow);

  return NextResponse.json(
    {
      beijingNow: `${today} ${String(clock.hour).padStart(2, "0")}:${String(clock.minute).padStart(2, "0")}`,
      businessDate: today,
      nextDate: tomorrow,
      todayExists: curatedToday.length > 0 || storeToday.length > 0,
      todayCount: Math.max(curatedToday.length, storeToday.length),
      tomorrowExists: curatedTomorrow.length > 0 || storeTomorrow.length > 0,
      tomorrowCount: Math.max(curatedTomorrow.length, storeTomorrow.length),
      latestAutomation: latestRun
        ? {
            id: latestRun.runKey,
            startedAt: latestRun.startedAt,
            finishedAt: latestRun.finishedAt,
            status: latestRun.status,
            message: latestRun.message ?? null,
          }
        : null,
      latestStoreDates: [...new Set(storeRecords.map((r) => r.forecastDate))].sort().slice(-10),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

const postSchema = z.object({
  action: z.enum(["revalidate", "check", "generate-missing", "verify-access"]),
  confirm: z.literal(true),
});

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "无权限" }, { status: 403 });
  const parsed = postSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "需要 confirm:true" }, { status: 400 });

  const { action } = parsed.data;
  let generateReport: unknown = null;

  if (action === "generate-missing") {
    try {
      const { runDailyForecastPipeline, resolvePipelinePhase } = await import(
        "@/lib/forecasts/daily-pipeline"
      );
      const today = getBeijingBusinessDate();
      const tomorrow = getBeijingTomorrowKey();
      // Prefer locking/publishing next trading day batch; also ensure today rows exist in store.
      generateReport = await runDailyForecastPipeline({
        forcePhase: resolvePipelinePhase() === "idle" ? "lock" : resolvePipelinePhase(),
        forceDraftDate: tomorrow,
      });
      // Second pass for today if still missing curated/store coverage.
      const curatedToday = getPublicTodayForecasts();
      if (curatedToday.length === 0) {
        generateReport = {
          tomorrow: generateReport,
          today: await runDailyForecastPipeline({
            forcePhase: "lock",
            forceDraftDate: today,
          }),
        };
      }
    } catch (err) {
      return NextResponse.json(
        {
          ok: false,
          error: err instanceof Error ? err.message : "补生成失败",
        },
        { status: 500 }
      );
    }
  }

  if (
    action === "revalidate" ||
    action === "check" ||
    action === "generate-missing" ||
    action === "verify-access"
  ) {
    revalidatePath("/");
    revalidatePath("/forecasts");
    revalidatePath("/forecasts/daily");
    revalidatePath("/member/tomorrow");
    revalidatePath("/member/weekly");
    revalidatePath("/api/forecasts/today");
    revalidatePath("/api/forecasts/tomorrow");
  }

  return NextResponse.json({
    ok: true,
    action,
    generateReport,
    accessNote:
      action === "verify-access"
        ? "已按当前会话重新校验权限缓存路径（force-dynamic + revalidatePath）"
        : undefined,
  });
}
