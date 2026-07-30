import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/permissions";
import { getBeijingTomorrowKey } from "@/lib/calendar/beijing-date";
import { upsertDailyForecastRecord, listDailyForecastRecords } from "@/lib/data/daily-accuracy-store";
import { buildLockedLevelsForAsset, validatePublishedPriceLevels } from "@/lib/market-data/price-levels";
import { DAILY_ACCURACY_ASSETS, DIRECTION_LABELS } from "@/types/daily-accuracy";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const schema = z.object({
  forecastDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

const CORE = ["BTC", "SPX", "NDX", "SSE", "HSTECH", "GLD", "WTI"] as const;

export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }
  const body = schema.safeParse(await request.json().catch(() => ({})));
  if (!body.success) {
    return NextResponse.json({ error: "无效参数" }, { status: 400 });
  }
  const forecastDate = body.data.forecastDate ?? getBeijingTomorrowKey();
  const nowIso = new Date().toISOString();
  const existing = await listDailyForecastRecords();
  const results: Array<{ symbol: string; ok: boolean; error?: string }> = [];

  for (const key of CORE) {
    const asset = DAILY_ACCURACY_ASSETS.find((a) => a.key === key);
    if (!asset) continue;
    try {
      const prior = existing.find(
        (r) => r.forecastDate === forecastDate && r.symbol === asset.symbol
      );
      const direction = prior?.direction ?? "FLAT";
      const directionLabel = prior?.directionLabel ?? DIRECTION_LABELS[direction];
      const levels = await buildLockedLevelsForAsset({
        symbol: asset.symbol,
        quoteSymbol: asset.quoteSymbol,
        market: asset.market,
        assetName: asset.assetName,
        directionLabel,
        forecastDate,
        publishedAt: nowIso,
      });
      const errors = validatePublishedPriceLevels({
        supportLevels: levels.supportLevels,
        resistanceLevels: levels.resistanceLevels,
        confirmation: levels.confirmation,
        invalidation: levels.invalidation,
        priceSnapshot: levels.priceSnapshot,
        ichingText: prior?.summary,
      });
      if (errors.length) {
        results.push({ symbol: asset.symbol, ok: false, error: errors.join("；") });
        continue;
      }

      const id = prior?.id ?? `df-${forecastDate}-${key}-tech-${Date.now()}`;
      await upsertDailyForecastRecord({
        id,
        forecastDate,
        assetName: asset.assetName,
        symbol: asset.symbol,
        market: asset.market,
        direction,
        directionLabel:
          directionLabel === "上涨" || directionLabel === "下跌" || directionLabel === "震荡"
            ? directionLabel
            : direction === "UP"
              ? "上涨"
              : direction === "DOWN"
                ? "下跌"
                : "震荡",
        probability: prior?.probability ?? 50,
        summary: prior?.summary ?? `${asset.assetName}下一交易日正式预测`,
        publishedAt: nowIso,
        cutoffAt: prior?.cutoffAt ?? `${forecastDate}T23:59:59+08:00`,
        status: "published",
        originalVersion: (prior?.originalVersion ?? 0) + 1,
        source: "MOOX Technical Price Structure",
        isSystemTest: false,
        quoteSymbol: asset.quoteSymbol,
        createdAt: prior?.createdAt ?? nowIso,
        updatedAt: nowIso,
        reviewedAt: nowIso,
        supportLevels: levels.supportLevels,
        resistanceLevels: levels.resistanceLevels,
        confirmation: levels.confirmation,
        invalidation: levels.invalidation,
        priceSnapshot: levels.priceSnapshot,
        priceDataSourceLabel: levels.priceDataSourceLabel,
        priceSnapshotAtLabel: levels.priceSnapshotAtLabel,
      });
      results.push({ symbol: asset.symbol, ok: true });
    } catch (err) {
      results.push({
        symbol: asset.symbol,
        ok: false,
        error: err instanceof Error ? err.message : "TECHNICAL_PRICE_DATA_UNAVAILABLE",
      });
    }
  }

  revalidatePath("/");
  revalidatePath("/member/tomorrow");
  revalidatePath("/api/forecasts/tomorrow");
  revalidatePath("/verification");

  const ok = results.every((r) => r.ok);
  return NextResponse.json({ ok, forecastDate, results });
}
