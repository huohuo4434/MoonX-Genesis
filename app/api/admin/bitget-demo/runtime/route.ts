import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/permissions";
import {
  getBitgetRuntimeState,
  refreshBitgetRuntimeHealthOnly,
  runBitgetDemoServerRuntime,
  setBitgetRuntimePaused,
} from "@/lib/bitget/demo-runtime";
import { getBitgetDemoEnvironment } from "@/lib/bitget/demo-client";
import { syncMemberAiTradingDeskSnapshot } from "@/lib/trading-signals/member-ai-trading-desk";
import { auditBitgetLiveResumeReadiness } from "@/lib/bitget/live-resume-readiness";
import { auditRecentBitgetLiveOrderFailures } from "@/lib/bitget/demo-client";
import { guardRuntimeAdminAction } from "@/lib/bitget/runtime-admin-action-core";
import { canStartMemberDeskSync } from "@/lib/bitget/runtime-deadline-core";
import { evaluateUnifiedLiveNewEntryGate } from "@/lib/trading-signals/unified-live-entry-gate";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "无权限" }, { status: 403 });
  try {
    return NextResponse.json(await getBitgetRuntimeState());
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "读取服务器执行状态失败" }, { status: 500 });
  }
}

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("REFRESH_HEALTH") }),
  z.object({ action: z.literal("RUN_NOW") }),
  z.object({ action: z.literal("PAUSE"), reason: z.string().trim().max(300).optional() }),
  z.object({ action: z.literal("RESUME"), confirmation: z.string().trim().max(100) }),
]);

export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "无权限" }, { status: 403 });
  try {
    const input = actionSchema.parse(await request.json());
    if (input.action === "REFRESH_HEALTH") {
      const state = await refreshBitgetRuntimeHealthOnly(new Date(), "ADMIN");
      return NextResponse.json({
        ok: true,
        readOnly: true,
        message: "只读健康快照已刷新；未运行策略、未下单、未解除暂停。",
        state,
      });
    }
    const live = getBitgetDemoEnvironment().mode === "LIVE_EXPERIMENT";
    const gate = await guardRuntimeAdminAction({
      action: input.action,
      pauseReason: input.action === "PAUSE" ? input.reason : undefined,
      resumeConfirmation: input.action === "RESUME" ? input.confirmation : undefined,
      strictResumeGate: live,
      getState: () => getBitgetRuntimeState(),
      setPaused: (paused, reason) => setBitgetRuntimePaused(paused, reason),
      auditFailures: async () => live ? auditBitgetLiveResumeReadiness() : auditRecentBitgetLiveOrderFailures(50),
    });
    if (gate.handled) {
      return NextResponse.json({
        ok: gate.allowed,
        ...(gate.error ? { error: gate.error } : {}),
        state: gate.state,
        ...(gate.audit ? { audit: gate.audit } : {}),
      }, { status: gate.status });
    }

    // RUN_NOW reaches this branch only while not paused. RESUME itself never runs a trading cycle.
    const now = new Date();
    const absoluteDeadlineAt = new Date(Date.now() + 285_000);
    const unifiedGate = live ? await evaluateUnifiedLiveNewEntryGate("official") : null;
    const report = await runBitgetDemoServerRuntime(now, "ADMIN", {
      absoluteDeadlineAt,
      forceManageOnly: Boolean(live && !unifiedGate?.allowed),
    });
    let memberDeskSync: { ok: true } | { ok: false; error: string } = { ok: true };
    try {
      if (!canStartMemberDeskSync(absoluteDeadlineAt.getTime())) {
        memberDeskSync = { ok: false, error: "deferred: insufficient runtime deadline remaining" };
      } else {
        await syncMemberAiTradingDeskSnapshot(now);
      }
    } catch (error) {
      memberDeskSync = { ok: false, error: error instanceof Error ? error.message : "会员台同步失败" };
    }
    return NextResponse.json({ ok: true, report, unifiedGate, memberDeskSync, state: await getBitgetRuntimeState() });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "服务器执行操作失败" }, { status: 400 });
  }
}
