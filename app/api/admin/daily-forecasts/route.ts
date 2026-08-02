import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/permissions";
import { upsertDailyForecastRecord, listDailyForecastRecords } from "@/lib/data/daily-accuracy-store";
import { defaultCutoffAt } from "@/lib/market-data/daily-prices";
import {
  DAILY_ACCURACY_ASSETS,
  DIRECTION_LABELS,
  PATTERN_LABELS,
  type DailyAccuracyDirection,
  type DailyAccuracyPattern,
  type DailyForecastRecord,
} from "@/types/daily-accuracy";

const upsertSchema = z.object({
  id: z.string().optional(),
  forecastDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  assetKey: z.enum(["BTC", "ETH", "SPX", "NDX", "SSE", "HSTECH", "GLD", "SILVER", "WTI"]),
  direction: z.enum(["UP", "DOWN", "FLAT"]),
  predictedPattern: z
    .enum([
      "UP",
      "DOWN",
      "RANGE",
      "RANGE_UP",
      "RANGE_DOWN",
      "UP_THEN_DOWN",
      "DOWN_THEN_UP",
      "SURGE_THEN_PULLBACK",
      "DIP_THEN_RECOVERY",
    ])
    .optional(),
  expectedPath: z.array(z.string().min(1).max(300)).max(12).optional(),
  probability: z.number().min(0).max(100).optional(),
  summary: z.string().max(2000).optional(),
  source: z.string().min(1).max(200),
  publishedAt: z.string().optional(),
  cutoffAt: z.string().optional(),
  action: z.enum(["save_draft", "publish", "withdraw"]),
  isSystemTest: z.boolean().optional(),
});

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }
  const records = await listDailyForecastRecords();
  return NextResponse.json({ records });
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  let body: z.infer<typeof upsertSchema>;
  try {
    body = upsertSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "无效参数" }, { status: 400 });
  }

  const asset = DAILY_ACCURACY_ASSETS.find((a) => a.key === body.assetKey);
  if (!asset) return NextResponse.json({ error: "未知资产" }, { status: 400 });

  const existing = body.id
    ? (await listDailyForecastRecords()).find((r) => r.id === body.id)
    : undefined;

  const nowIso = new Date().toISOString();
  const cutoffAt = body.cutoffAt ?? defaultCutoffAt(body.forecastDate, asset.market);
  const publishedAt = body.publishedAt ?? existing?.publishedAt ?? nowIso;

  if (body.action === "withdraw" && existing) {
    const next: DailyForecastRecord = {
      ...existing,
      status: "draft",
      withdrawnAt: nowIso,
      updatedAt: nowIso,
    };
    await upsertDailyForecastRecord(next);
    return NextResponse.json({ ok: true, record: next });
  }

  // Lock published fields: create new version instead of overwriting direction
  if (
    existing &&
    existing.status === "published" &&
    body.action === "publish" &&
    (existing.direction !== body.direction ||
      existing.forecastDate !== body.forecastDate ||
      existing.symbol !== asset.symbol)
  ) {
    const newId = `df-${body.forecastDate}-${asset.key}-v${existing.originalVersion + 1}-${Date.now()}`;
    const record: DailyForecastRecord = {
      id: newId,
      forecastDate: body.forecastDate,
      assetName: asset.assetName,
      symbol: asset.symbol,
      market: asset.market,
      direction: body.direction,
      directionLabel: DIRECTION_LABELS[body.direction as DailyAccuracyDirection],
      predictedPattern: body.predictedPattern,
      predictedPatternLabel: body.predictedPattern ? PATTERN_LABELS[body.predictedPattern as DailyAccuracyPattern] : undefined,
      expectedPath: body.expectedPath,
      probability: body.probability,
      summary: body.summary,
      publishedAt: nowIso,
      cutoffAt,
      status: new Date(nowIso).getTime() <= new Date(cutoffAt).getTime() ? "published" : "invalid",
      originalVersion: existing.originalVersion + 1,
      source: body.source,
      isSystemTest: body.isSystemTest ?? false,
      quoteSymbol: asset.quoteSymbol,
      createdAt: nowIso,
      updatedAt: nowIso,
      reviewedAt: nowIso,
    };
    await upsertDailyForecastRecord(record);
    return NextResponse.json({ ok: true, record, note: "已创建新版本，原发布版本保持锁定" });
  }

  const id = existing?.id ?? body.id ?? `df-${body.forecastDate}-${asset.key}-${Date.now()}`;
  let status: DailyForecastRecord["status"] = "draft";
  if (body.action === "publish") {
    status = new Date(publishedAt).getTime() <= new Date(cutoffAt).getTime() ? "published" : "invalid";
  } else if (existing?.status === "published" || existing?.status === "verifying" || existing?.status === "verified") {
    // save_draft on locked published record is not allowed to overwrite — keep as draft clone
    status = "draft";
  }

  const record: DailyForecastRecord = {
    id,
    forecastDate: body.forecastDate,
    assetName: asset.assetName,
    symbol: asset.symbol,
    market: asset.market,
    direction: body.direction,
    directionLabel: DIRECTION_LABELS[body.direction as DailyAccuracyDirection],
    predictedPattern: body.predictedPattern ?? existing?.predictedPattern,
    predictedPatternLabel:
      body.predictedPattern ? PATTERN_LABELS[body.predictedPattern as DailyAccuracyPattern] : existing?.predictedPatternLabel,
    expectedPath: body.expectedPath ?? existing?.expectedPath,
    probability: body.probability,
    summary: body.summary,
    publishedAt: body.action === "publish" ? publishedAt : existing?.publishedAt ?? nowIso,
    cutoffAt,
    status,
    originalVersion: existing?.originalVersion ?? 1,
    source: body.source,
    isSystemTest: body.isSystemTest ?? false,
    quoteSymbol: asset.quoteSymbol,
    createdAt: existing?.createdAt ?? nowIso,
    updatedAt: nowIso,
    reviewedAt: body.action === "publish" ? nowIso : existing?.reviewedAt ?? null,
  };

  // Never overwrite locked published direction in-place
  if (
    existing &&
    (existing.status === "published" || existing.status === "verified" || existing.status === "verifying") &&
    body.action === "save_draft"
  ) {
    return NextResponse.json(
      { error: "已发布记录不可直接改方向，请发布新版本" },
      { status: 400 }
    );
  }

  await upsertDailyForecastRecord(record);
  return NextResponse.json({ ok: true, record });
}
