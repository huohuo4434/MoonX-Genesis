import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/permissions";
import {
  getThreeHorizonStrategyDashboard,
  updateThreeHorizonProfile,
} from "@/lib/trading-signals/three-horizon-strategy";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  strategyType: z.enum(["INTRADAY", "SWING", "POSITION"]),
  enabled: z.boolean().optional(),
  mode: z.enum(["SHADOW", "DEMO"]).optional(),
  riskPerTradePct: z.number().min(0.1).max(0.5).optional(),
  minConfidence: z.number().int().min(50).max(90).optional(),
  maxTradesPerDay: z.number().int().min(0).max(4).optional(),
});

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }
  try {
    return NextResponse.json(await getThreeHorizonStrategyDashboard());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "读取三周期策略失败" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }
  try {
    const input = updateSchema.parse(await request.json());
    const profile = await updateThreeHorizonProfile(input);
    return NextResponse.json({
      ok: true,
      profile,
      dashboard: await getThreeHorizonStrategyDashboard(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "更新三周期策略失败" },
      { status: 400 }
    );
  }
}
