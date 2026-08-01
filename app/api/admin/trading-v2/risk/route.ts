import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/permissions";
import {
  getRiskSettings,
  updateRiskSettings,
} from "@/lib/trading-signals/v2-store";

type RiskShape = {
  riskPerTradePct: number;
  maxPositionPct: number;
  star1PositionPct: number;
  star2PositionPct: number;
  star3PositionPct: number;
  star4PositionPct: number;
  star5PositionPct: number;
  dailyLossStopPct: number;
  maxConsecutiveLosses: number;
  breakevenAfterTarget1: boolean;
  target1ClosePct: number;
  target2ClosePct: number;
};

const schema = z
  .object({
    riskPerTradePct: z.number().min(0.1).max(10),
    maxPositionPct: z.number().min(1).max(100),
    star1PositionPct: z.number().min(0).max(100),
    star2PositionPct: z.number().min(0).max(100),
    star3PositionPct: z.number().min(0).max(100),
    star4PositionPct: z.number().min(0).max(100),
    star5PositionPct: z.number().min(0).max(100),
    dailyLossStopPct: z.number().min(0.5).max(30),
    maxConsecutiveLosses: z.number().int().min(1).max(20),
    breakevenAfterTarget1: z.boolean(),
    target1ClosePct: z.number().min(1).max(100),
    target2ClosePct: z.number().min(0).max(100),
  })
  .refine((value: RiskShape) => value.target1ClosePct + value.target2ClosePct <= 100, {
    message: "目标1和目标2减仓比例之和不能超过100%",
  })
  .refine(
    (value: RiskShape) =>
      value.star1PositionPct <= value.star2PositionPct &&
      value.star2PositionPct <= value.star3PositionPct &&
      value.star3PositionPct <= value.star4PositionPct &&
      value.star4PositionPct <= value.star5PositionPct,
    { message: "星级仓位上限必须随星级递增" }
  );

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "无权限" }, { status: 403 });
  return NextResponse.json(await getRiskSettings());
}

export async function PUT(request: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "无权限" }, { status: 403 });
  try {
    const body = schema.parse(await request.json());
    return NextResponse.json({ ok: true, settings: await updateRiskSettings(body) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "保存失败" },
      { status: 400 }
    );
  }
}
