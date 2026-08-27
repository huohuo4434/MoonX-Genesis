import { NextRequest, NextResponse } from "next/server";
import { runBitgetDemoServerRuntime } from "@/lib/bitget/demo-runtime";
import { evaluateUnifiedLiveNewEntryGate } from "@/lib/trading-signals/unified-live-entry-gate";
import { isUnifiedLiveActiveExecutionEnabled } from "@/lib/trading-signals/unified-live-config";

// MOOX_V72010_1000U_AUTO_CRON: authoritative minute runner; never places orders directly.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}` || request.nextUrl.searchParams.get("secret") === secret;
}

function reportCount(value: Record<string, unknown> | null, key: string): number {
  const candidate = value?.[key];
  if (Array.isArray(candidate)) return candidate.length;
  return typeof candidate === "number" && Number.isFinite(candidate) ? candidate : 0;
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const requestStartedAtMs = Date.now();
  const now = new Date(requestStartedAtMs);
  const unifiedGate = await evaluateUnifiedLiveNewEntryGate("official").catch(() => ({
    allowed: false,
    reasons: ["UNIFIED_LIVE_GATE_UNAVAILABLE"],
    mode: "MANAGE_ONLY" as const,
    positionManagementContinues: true,
  }));

  const strategyActiveExecutionEnabled = isUnifiedLiveActiveExecutionEnabled();
  const autoEntryAllowed = unifiedGate.allowed && strategyActiveExecutionEnabled;
  const effectiveGate = strategyActiveExecutionEnabled
    ? unifiedGate
    : { ...unifiedGate, allowed: false, reasons: [...unifiedGate.reasons, "LEGACY_STRATEGY_EXECUTION_DISABLED"] };

  const report = await runBitgetDemoServerRuntime(now, "CRON", {
    absoluteDeadlineAt: new Date(requestStartedAtMs + 105_000),
    forceManageOnly: !autoEntryAllowed,
    forceManageOnlyReason: !autoEntryAllowed ? effectiveGate.reasons.join(",") : undefined,
  });

  // Production-safe summary for diagnosing the live runner without logging
  // account values, credentials, order ids, quantities or strategy payloads.
  console.info("[prediction-auto-trader]", JSON.stringify({
    ok: report.ok,
    locked: report.locked,
    paused: report.paused,
    execution: autoEntryAllowed ? "LIVE" : "MANAGE_ONLY",
    marketOk: report.market.ok,
    accountConnected: report.reconcile.connected,
    scannedStrategies: reportCount(report.threeHorizon, "scannedStrategies"),
    decisions: Array.isArray(report.threeHorizon?.decisions) ? report.threeHorizon.decisions.length : 0,
    orderAttempts: reportCount(report.threeHorizon, "orderAttempts"),
    orderSuccess: reportCount(report.threeHorizon, "orderSuccess"),
    orderErrors: reportCount(report.threeHorizon, "orderErrors"),
  }));

  return NextResponse.json({
    ok: report.ok,
    execution: autoEntryAllowed ? "THREE_HORIZON_LIVE_ENABLED" : "MANAGE_ONLY",
    unifiedGate: effectiveGate,
    report,
  });
}
