import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/permissions";
import {
  setPredictionAutoTraderEnabled,
  updatePredictionAutoTraderSettings,
} from "@/lib/trading-signals/prediction-auto-trader";

const settingsSchema = z
  .object({
    btcEnabled: z.boolean(),
    ethEnabled: z.boolean(),
    positionPct: z.number().min(0.1).max(10),
    stopLossPct: z.number().min(0.2).max(10),
    target1Pct: z.number().min(0.2).max(20),
    target2Pct: z.number().min(0.2).max(30),
    target3Pct: z.number().min(0.2).max(50),
    minDipPct: z.number().min(0.1).max(10),
    reboundConfirmPct: z.number().min(0.05).max(5),
    minRallyPct: z.number().min(0.1).max(10),
    reversalConfirmPct: z.number().min(0.05).max(5),
    minForecastConfidence: z.number().min(50).max(95),
    maxTradesPerSymbolDay: z.number().int().min(1).max(5),
    requireDailyWeeklyAlignment: z.boolean(),
  })
  .refine(
    (value) => value.target1Pct < value.target2Pct && value.target2Pct < value.target3Pct,
    { message: "止盈目标必须按目标1、目标2、目标3递增" }
  );

export async function PUT(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }
  try {
    const body = settingsSchema.parse(await request.json());
    return NextResponse.json({
      ok: true,
      settings: await updatePredictionAutoTraderSettings(body),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "保存失败" },
      { status: 400 }
    );
  }
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }
  try {
    const body = z.object({ enabled: z.boolean() }).parse(await request.json());
    return NextResponse.json({
      ok: true,
      settings: await setPredictionAutoTraderEnabled(body.enabled),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "设置失败" },
      { status: 400 }
    );
  }
}
