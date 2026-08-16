import { NextResponse } from "next/server";
import { collectReflectedForecasts } from "@/lib/forecasts/forecast-record-reflection";

export const dynamic = "force-dynamic";

function authorize(request: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ ok: false, error: "cron_unavailable" }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  return null;
}

function mondayAfterSaturday(now = new Date()) {
  const current = new Date(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).format(now) + "T12:00:00Z");
  const day = current.getUTCDay();
  const delta = day === 0 ? 1 : day === 6 ? 2 : (8 - day) % 7;
  current.setUTCDate(current.getUTCDate() + delta);
  return current.toISOString().slice(0, 10);
}

export async function GET(request: Request) {
  const denied = authorize(request);
  if (denied) return denied;
  const targetDate = mondayAfterSaturday();
  const loaders = [
      () => import("@/lib/data/tomorrow-forecast-access"),
      () => import("@/lib/data/daily-forecasts"),
      () => import("@/lib/data/weekly-analysis-access"),
      () => import("@/lib/data/weekly-analysis"),
      () => import("@/lib/data/conviction/access"),
      () => import("@/lib/forecasts/public-daily-fallback"),
      () => import("@/lib/forecasts/tomorrow-direction"),
      () => import("@/lib/forecasts/weekly-to-daily"),
      () => import("@/lib/data/published-daily-forecasts-20260728"),
      () => import("@/lib/data/published-daily-forecasts-20260730"),
      () => import("@/lib/data/published-weekly-analysis-20260803"),
      () => import("@/lib/data/published-weekly-analysis-20260727"),
      () => import("@/lib/data/published-weekly-analysis-20260810"),
      () => import("@/lib/data/published-weekly-analysis-20260817"),
      () => import("@/lib/data/published-weekly-revision-20260810"),
      () => import("@/lib/data/published-weekly-us-indices-20260809")
  ];
  const settled = await Promise.allSettled(loaders.map((load) => load()));
  const sources: unknown[] = [];
  for (const item of settled) {
    if (item.status === "fulfilled") sources.push(item.value);
  }
  const records = collectReflectedForecasts(sources, targetDate);
  return NextResponse.json({
    ok: true,
    mode: "DERIVED_ON_READ",
    rule: "不单独起日卦；周卦/阶段卦拆日，技术只做位置确认",
    targetDate,
    coreCoverage: records.length,
    records,
    note: "详情页通过统一组件按当前/下一锁定周期即时生成；本任务负责周六健康检查和预热，不删除或覆盖任何预测。",
  }, { headers: { "Cache-Control": "no-store" } });
}
