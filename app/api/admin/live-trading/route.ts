import { NextRequest, NextResponse } from "next/server";
import { isUnifiedLiveAdmin, resolveUnifiedLiveActor } from "@/lib/trading-signals/unified-live-auth";
import { readUnifiedLiveRuntimeConfig } from "@/lib/trading-signals/unified-live-config";
import { getBitgetDemoEnvironment } from "@/lib/bitget/demo-client";
import { getUnifiedLiveRuntimeStatus, runUnifiedLiveCustodyCycle } from "@/lib/trading-signals/unified-live-runtime";
import { claimUnifiedLivePosition, setUnifiedLiveMode } from "@/lib/trading-signals/unified-live-store";
import type { UnifiedLiveHorizon, UnifiedLiveMode } from "@/types/unified-live-trading";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function admin(request: NextRequest) {
  const actor = await resolveUnifiedLiveActor(request);
  return (await isUnifiedLiveAdmin(actor)) ? actor : null;
}

export async function GET(request: NextRequest) {
  if (!(await admin(request))) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  return NextResponse.json(await getUnifiedLiveRuntimeStatus("official"));
}

export async function POST(request: NextRequest) {
  if (!(await admin(request))) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const action = String(payload?.action ?? "").toUpperCase();
  if (action === "RUN_AUDIT") {
    return NextResponse.json(await runUnifiedLiveCustodyCycle({ trigger: "ADMIN_MANUAL_AUDIT", ownerKey: "official" }));
  }
  if (action === "SET_MODE") {
    const mode = String(payload?.mode ?? "MANAGE_ONLY").toUpperCase() as UnifiedLiveMode;
    if (!["PAUSED", "MANAGE_ONLY", "LIVE"].includes(mode)) return NextResponse.json({ error: "INVALID_MODE" }, { status: 400 });
    const runtime = readUnifiedLiveRuntimeConfig();
    const status = await getUnifiedLiveRuntimeStatus("official");
    const bitget = getBitgetDemoEnvironment();
    const liveRuntimeReady = runtime.mode === "LIVE"
      && runtime.allowLiveSwitch
      && runtime.allowNewEntriesByEnv
      && runtime.positionManagementEnabled;
    const strategyActiveExecutionEnabled = process.env.MOOX_LIVE_ACTIVE_EXECUTION_V641?.toLowerCase() !== "false";
    const bitgetReady = bitget.mode === "LIVE_EXPERIMENT"
      && bitget.configured
      && bitget.executionAllowed
      && bitget.liveConfirmationAccepted
      && Math.abs(bitget.liveInitialCapitalUsdt - 1000) < 0.01;
    if (mode === "LIVE" && (!liveRuntimeReady || !bitgetReady || !strategyActiveExecutionEnabled || status.audit?.freezeNewEntries || status.migrationRequired)) {
      return NextResponse.json({
        error: "LIVE_SWITCH_BLOCKED",
        runtime,
        bitgetReadiness: {
          mode: bitget.mode,
          configured: bitget.configured,
          executionAllowed: bitget.executionAllowed,
          liveConfirmationAccepted: bitget.liveConfirmationAccepted,
          initialCapitalUsdt: bitget.liveInitialCapitalUsdt,
          strategyActiveExecutionEnabled,
        },
        blockers: [
          ...(status.audit?.issues ?? []),
          ...(!strategyActiveExecutionEnabled ? [{ code: "LEGACY_STRATEGY_EXECUTION_DISABLED", severity: "BLOCK", message: "MOOX_LIVE_ACTIVE_EXECUTION_V641 is explicitly false" }] : []),
        ],
      }, { status: 409 });
    }
    const account = await setUnifiedLiveMode({
      ownerKey: "official",
      mode,
      newEntriesEnabled: mode === "LIVE",
      positionManagementEnabled: mode !== "PAUSED",
    });
    return NextResponse.json({ ok: true, account });
  }
  if (action === "CLAIM_POSITION") {
    const horizon = String(payload?.horizon ?? "").toUpperCase() as UnifiedLiveHorizon;
    if (!["SHORT", "MEDIUM", "LONG"].includes(horizon)) return NextResponse.json({ error: "INVALID_HORIZON" }, { status: 400 });
    const custody = await runUnifiedLiveCustodyCycle({ trigger: "ADMIN_CLAIM_PREFLIGHT", ownerKey: "official" });
    const positionKey = String(payload?.positionKey ?? "");
    const position = custody.exchangePositions?.find((item) => item.positionKey === positionKey);
    if (!position) return NextResponse.json({ error: "POSITION_NOT_FOUND" }, { status: 404 });
    const slice = await claimUnifiedLivePosition({ ownerKey: "official", position, horizon });
    return NextResponse.json({ ok: true, slice });
  }
  return NextResponse.json({ error: "UNKNOWN_ACTION" }, { status: 400 });
}
