import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isUnifiedLiveAdmin, resolveUnifiedLiveActor } from "@/lib/trading-signals/unified-live-auth";
import { isUnifiedLiveActiveExecutionEnabled, readUnifiedLiveRuntimeConfig } from "@/lib/trading-signals/unified-live-config";
import { getBitgetDemoEnvironment } from "@/lib/bitget/demo-client";
import { getUnifiedLiveRuntimeStatus, inspectUnifiedLiveCustody, runUnifiedLiveCustodyCycle } from "@/lib/trading-signals/unified-live-runtime";
import { claimUnifiedLivePosition, setUnifiedLiveMode } from "@/lib/trading-signals/unified-live-store";
import {
  applyUnifiedLiveModeChange,
  buildUnifiedLiveRestoreBlockers,
  type UnifiedLiveRestoreReadiness,
} from "@/lib/trading-signals/unified-live-admin-control-core";
import type { UnifiedLiveCustodyAudit, UnifiedLiveHorizon, UnifiedLiveMode } from "@/types/unified-live-trading";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function requireAdmin(request: NextRequest) {
  const actor = await resolveUnifiedLiveActor(request);
  return (await isUnifiedLiveAdmin(actor)) ? actor : null;
}

async function readRestoreReadiness(status: {
  migrationRequired?: boolean;
  audit?: UnifiedLiveCustodyAudit | null;
}, checkExperiment = true): Promise<UnifiedLiveRestoreReadiness> {
  const runtime = readUnifiedLiveRuntimeConfig();
  const bitget = getBitgetDemoEnvironment();
  // Read the authoritative row without ensure/sync helpers (those can create or renew state).
  let liveExperiment: UnifiedLiveRestoreReadiness["liveExperiment"] = null;
  if (checkExperiment && bitget.mode === "LIVE_EXPERIMENT" && prisma) {
    try {
      const rows = await prisma.$queryRaw<Array<{ status: string; started_at: Date | null; ends_at: Date | null }>>`
        SELECT status, started_at, ends_at FROM trade_bitget_live_experiment WHERE id = 'default' LIMIT 1
      `;
      if (rows[0]) liveExperiment = { status: rows[0].status, startedAt: rows[0].started_at, endsAt: rows[0].ends_at };
    } catch {
      // Missing table, unavailable DB, or failed read is unknown, never permission.
    }
  }
  return {
    runtimeModeLive: runtime.mode === "LIVE",
    liveSwitchAllowed: runtime.allowLiveSwitch,
    environmentAllowsNewEntries: runtime.allowNewEntriesByEnv,
    positionManagementEnabled: runtime.positionManagementEnabled,
    bitgetLiveExperiment: bitget.mode === "LIVE_EXPERIMENT",
    liveExperiment,
    bitgetConfigured: bitget.configured,
    bitgetExecutionAllowed: bitget.executionAllowed,
    bitgetLiveConfirmationAccepted: bitget.liveConfirmationAccepted,
    initialCapitalIs1000U: Math.abs(bitget.liveInitialCapitalUsdt - 1000) < 0.01,
    strategyActiveExecutionEnabled: isUnifiedLiveActiveExecutionEnabled(),
    migrationRequired: Boolean(status.migrationRequired),
    custodyFreezeNewEntries: Boolean(status.audit?.freezeNewEntries),
    custodyIssues: status.audit?.issues ?? [],
  };
}

export async function GET(request: NextRequest) {
  if (!(await requireAdmin(request))) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  const status = await inspectUnifiedLiveCustody("official");
  const restoreBlockers = buildUnifiedLiveRestoreBlockers(await readRestoreReadiness(status));
  return NextResponse.json({ ...status, restoreBlockers }, {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin(request))) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const action = String(payload?.action ?? "").toUpperCase();
  if (action === "RUN_AUDIT") {
    return NextResponse.json(await runUnifiedLiveCustodyCycle({ trigger: "ADMIN_MANUAL_AUDIT", ownerKey: "official" }));
  }
  if (action === "SET_MODE") {
    const mode = String(payload?.mode ?? "MANAGE_ONLY").toUpperCase() as UnifiedLiveMode;
    if (!["PAUSED", "MANAGE_ONLY", "LIVE"].includes(mode)) return NextResponse.json({ error: "INVALID_MODE" }, { status: 400 });
    const status = await getUnifiedLiveRuntimeStatus("official");
    const result = await applyUnifiedLiveModeChange({
      mode,
      confirmation: payload?.confirmation,
      readiness: await readRestoreReadiness(status, mode === "LIVE"),
      apply: (nextMode) => setUnifiedLiveMode({
        ownerKey: "official",
        mode: nextMode,
        newEntriesEnabled: nextMode === "LIVE",
        positionManagementEnabled: nextMode !== "PAUSED",
      }),
    });
    if (!result.ok) return NextResponse.json(result, { status: 409 });
    return NextResponse.json(result);
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
