import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/permissions";
import {
  getBitgetRuntimeState,
  runBitgetDemoServerRuntime,
  setBitgetRuntimePaused,
} from "@/lib/bitget/demo-runtime";
import { syncMemberAiTradingDeskSnapshot } from "@/lib/trading-signals/member-ai-trading-desk";
import { auditRecentBitgetLiveOrderFailures } from "@/lib/bitget/demo-client";
import { guardRuntimeAdminAction } from "@/lib/bitget/runtime-admin-action-core";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }
  try {
    return NextResponse.json(await getBitgetRuntimeState());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "读取服务器执行状态失败" },
      { status: 500 }
    );
  }
}

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("RUN_NOW") }),
  z.object({ action: z.literal("PAUSE"), reason: z.string().trim().max(300).optional() }),
  z.object({ action: z.literal("RESUME") }),
]);

export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }
  try {
    const input = actionSchema.parse(await request.json());
    const gate = await guardRuntimeAdminAction({
      action: input.action,
      pauseReason: input.action === "PAUSE" ? input.reason : undefined,
      getState: () => getBitgetRuntimeState(),
      setPaused: (paused, reason) => setBitgetRuntimePaused(paused, reason),
      auditFailures: () => auditRecentBitgetLiveOrderFailures(50),
    });
    if (gate.handled) {
      return NextResponse.json(
        {
          ok: gate.allowed,
          ...(gate.error ? { error: gate.error } : {}),
          state: gate.state,
          ...(gate.audit ? {
            audit: {
              safeToConsiderResume: gate.audit.safeToConsiderResume,
              summary: gate.audit.summary,
              positionsCount: gate.audit.positionsCount,
              pendingStrategyOrdersCount: gate.audit.pendingStrategyOrdersCount,
            },
          } : {}),
        },
        { status: gate.status }
      );
    }

    const now = new Date();
    const report = await runBitgetDemoServerRuntime(now, "ADMIN");
    let memberDeskSync: { ok: true } | { ok: false; error: string } = { ok: true };
    try {
      await syncMemberAiTradingDeskSnapshot(now);
    } catch (error) {
      memberDeskSync = {
        ok: false,
        error: error instanceof Error ? error.message : "会员台同步失败",
      };
    }
    return NextResponse.json({
      ok: true,
      report,
      memberDeskSync,
      state: await getBitgetRuntimeState(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "服务器执行操作失败" },
      { status: 400 }
    );
  }
}
