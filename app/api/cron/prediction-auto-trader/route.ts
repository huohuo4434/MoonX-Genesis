import { NextRequest, NextResponse } from "next/server";
import { runBitgetDemoServerRuntime } from "@/lib/bitget/demo-runtime";
import { evaluateUnifiedLiveNewEntryGate } from "@/lib/trading-signals/unified-live-entry-gate";
import { isUnifiedLiveActiveExecutionEnabled } from "@/lib/trading-signals/unified-live-config";

// MOOX_V72010_1000U_AUTO_CRON: authoritative minute runner; never places orders directly.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}` || request.nextUrl.searchParams.get("secret") === secret;
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const now = new Date();
  const unifiedGate = await evaluateUnifiedLiveNewEntryGate("official").catch((error) => ({
    allowed: false,
    reasons: [error instanceof Error ? error.message : "UNIFIED_LIVE_GATE_UNAVAILABLE"],
    mode: "MANAGE_ONLY" as const,
    positionManagementContinues: true,
  }));

  const strategyActiveExecutionEnabled = isUnifiedLiveActiveExecutionEnabled();
  const autoEntryAllowed = unifiedGate.allowed && strategyActiveExecutionEnabled;
  const effectiveGate = strategyActiveExecutionEnabled
    ? unifiedGate
    : { ...unifiedGate, allowed: false, reasons: [...unifiedGate.reasons, "LEGACY_STRATEGY_EXECUTION_DISABLED"] };

  const report = await runBitgetDemoServerRuntime(now, "CRON", {
    absoluteDeadlineAt: new Date(Date.now() + 285_000),
    forceManageOnly: !autoEntryAllowed,
  });

  return NextResponse.json({
    ok: report.ok,
    execution: autoEntryAllowed ? "THREE_HORIZON_LIVE_ENABLED" : "MANAGE_ONLY",
    unifiedGate: effectiveGate,
    report,
  });
}
