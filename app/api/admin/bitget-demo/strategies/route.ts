import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/permissions";
import {
  getThreeHorizonStrategyDashboard,
  updateThreeHorizonProfile,
} from "@/lib/trading-signals/three-horizon-strategy";
import { runUnifiedLiveCustodyCycle } from "@/lib/trading-signals/unified-live-runtime";
import { evaluateUnifiedLiveNewEntryGate } from "@/lib/trading-signals/unified-live-entry-gate";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  strategyType: z.enum(["INTRADAY", "SWING", "POSITION"]),
  enabled: z.boolean().optional(),
  mode: z.enum(["SHADOW", "DEMO"]).optional(),
  riskPerTradePct: z.number().min(0.1).max(0.5).optional(),
  planningMinConfidence: z.number().int().min(40).max(80).optional(),
  minConfidence: z.number().int().min(50).max(90).optional(),
  maxTradesPerDay: z.number().int().min(0).max(4).optional(),
});

async function legacyUnifiedSourceGET() {
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

async function legacyUnifiedSourcePOST(request: NextRequest) {
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

// MOOX_UNIFIED_LIVE_WRAPPER_V72031:app_api_admin_bitget-demo_strategies_route.ts:GET
export async function GET() {
  const custody = await runUnifiedLiveCustodyCycle({
    trigger: "app_api_admin_bitget-demo_strategies_route.ts:GET",
    ownerKey: "official",
  });
  const gate = await evaluateUnifiedLiveNewEntryGate("official");
  if (!gate.allowed) {
    return Response.json({
      ok: true,
      unifiedLive: true,
      mode: gate.mode,
      newOrdersPlaced: 0,
      positionManagementContinues: true,
      blockedReasons: gate.reasons,
      custody,
    });
  }
  return legacyUnifiedSourceGET();
}

// MOOX_UNIFIED_LIVE_WRAPPER_V72031:app_api_admin_bitget-demo_strategies_route.ts:POST
export async function POST(request: NextRequest) {
  const custody = await runUnifiedLiveCustodyCycle({
    trigger: "app_api_admin_bitget-demo_strategies_route.ts:POST",
    ownerKey: "official",
  });
  const gate = await evaluateUnifiedLiveNewEntryGate("official");
  if (!gate.allowed) {
    return Response.json({
      ok: true,
      unifiedLive: true,
      mode: gate.mode,
      newOrdersPlaced: 0,
      positionManagementContinues: true,
      blockedReasons: gate.reasons,
      custody,
    });
  }
  return legacyUnifiedSourcePOST(request);
}
