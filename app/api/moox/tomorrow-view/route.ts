import { NextResponse } from "next/server";
import { collectReflectedForecasts } from "@/lib/forecasts/forecast-record-reflection";

export const dynamic = "force-dynamic";

function beijingParts(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hour12: false }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, hour: Number(get("hour") || 0) };
}

function plusDays(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export async function GET() {
  const bj = beijingParts();
  const targetDate = plusDays(bj.date, 1);
  if (bj.hour < 20) {
    return NextResponse.json({ ok: true, published: false, targetDate, records: [], message: "明日观点将在北京时间20:00发布" }, { headers: { "Cache-Control": "no-store" } });
  }
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
    published: records.length > 0,
    targetDate,
    records,
    message: records.length ? "已读取当前有效锁定版本；历史版本保持不变" : "尚无已锁定明日记录，系统不会删除今日或历史预测",
  }, { headers: { "Cache-Control": "no-store" } });
}
