import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/permissions";
import {
  getStrategyValidationDashboard,
  runStrategyValidationCycle,
  setStrategyExperimentEnabled,
} from "@/lib/trading-signals/strategy-validation";

export const dynamic = "force-dynamic";

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("refresh") }),
  z.object({
    action: z.literal("setExperiment"),
    experimentId: z.string().min(3).max(120),
    enabled: z.boolean(),
  }),
]);

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }
  try {
    return NextResponse.json(await getStrategyValidationDashboard());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "读取Phase 3验收中心失败" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }
  try {
    const input = actionSchema.parse(await request.json());
    if (input.action === "refresh") {
      const report = await runStrategyValidationCycle({ source: "ADMIN" });
      return NextResponse.json({
        ok: report.ok,
        report,
        dashboard: await getStrategyValidationDashboard(),
      });
    }
    await setStrategyExperimentEnabled(input.experimentId, input.enabled);
    return NextResponse.json({
      ok: true,
      dashboard: await getStrategyValidationDashboard(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Phase 3操作失败" },
      { status: 400 }
    );
  }
}
