import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/permissions";
import {
  clearTradingReliabilityAdminOverride,
  getTradingReliabilityDashboard,
  retryFailedTradeOutbox,
  runTradingReliabilityWatchdog,
  setTradingReliabilityAdminMode,
} from "@/lib/trading-signals/trading-reliability";

export const dynamic = "force-dynamic";

const inputSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("refresh") }),
  z.object({ action: z.literal("retryOutbox") }),
  z.object({ action: z.literal("clearOverride") }),
  z.object({ action: z.literal("setMode"), mode: z.enum(["MANAGE_ONLY", "PAUSED"]) }),
]);

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }
  try {
    return NextResponse.json(await getTradingReliabilityDashboard());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "读取Phase 4可靠性中心失败" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }
  try {
    const input = inputSchema.parse(await request.json());
    let result: unknown = null;
    if (input.action === "refresh") {
      result = await runTradingReliabilityWatchdog({ source: "ADMIN" });
    } else if (input.action === "retryOutbox") {
      result = await retryFailedTradeOutbox();
    } else if (input.action === "clearOverride") {
      await clearTradingReliabilityAdminOverride();
      result = await runTradingReliabilityWatchdog({ source: "ADMIN" });
    } else {
      await setTradingReliabilityAdminMode(input.mode);
    }
    return NextResponse.json({
      ok: true,
      result,
      dashboard: await getTradingReliabilityDashboard(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Phase 4操作失败" },
      { status: 400 }
    );
  }
}
