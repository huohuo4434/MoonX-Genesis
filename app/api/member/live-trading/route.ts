import { NextRequest, NextResponse } from "next/server";
import {
  isUnifiedLiveAdmin,
  resolveUnifiedLiveActor,
} from "@/lib/trading-signals/unified-live-auth";
import { getBitgetDemoEnvironment } from "@/lib/bitget/demo-client";
import { evaluateUnifiedLiveNewEntryGate } from "@/lib/trading-signals/unified-live-entry-gate";
import { readUnifiedLiveRuntimeConfig } from "@/lib/trading-signals/unified-live-config";
import {
  ensureUnifiedLiveAccount,
  getUnifiedLiveAccount,
} from "@/lib/trading-signals/unified-live-store";
import { runUnifiedLiveCustodyCycle } from "@/lib/trading-signals/unified-live-runtime";
import { getThreeHorizonStrategyDashboard } from "@/lib/trading-signals/three-horizon-strategy";

// MOOX_V72010_OFFICIAL_LIVE_STATUS: admin sees official 1000U account + scan diagnostics.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const actor = await resolveUnifiedLiveActor(request);
  if (!actor) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const officialControl = await isUnifiedLiveAdmin(actor);
  const ownerKey = officialControl ? "official" : `member:${actor.id}`;
  const accountScope = officialControl ? "OFFICIAL" : "MEMBER";
  const ensured = await ensureUnifiedLiveAccount({ ownerKey, accountScope, displayName: officialControl ? "MOOX Official 1000U" : actor.email });
  if (!ensured.ok) {
    return NextResponse.json({
      migrationRequired: true,
      account: null,
      scope: accountScope,
      officialControl,
    });
  }

  if (officialControl) {
    await runUnifiedLiveCustodyCycle({ trigger: "OFFICIAL_MEMBER_STATUS", ownerKey });
  }
  const result = await getUnifiedLiveAccount(ownerKey);

  if (!officialControl) {
    return NextResponse.json({
      migrationRequired: result.migrationRequired,
      account: result.account,
      scope: accountScope,
      officialControl: false,
      localAgentRequired: true,
    });
  }

  const runtimeConfig = readUnifiedLiveRuntimeConfig();
  const bitget = getBitgetDemoEnvironment();
  const strategyDashboard = await getThreeHorizonStrategyDashboard().catch(() => null);
  const strategyActiveExecutionEnabled = process.env.MOOX_LIVE_ACTIVE_EXECUTION_V641?.toLowerCase() !== "false";
  const baseNewEntryGate = await evaluateUnifiedLiveNewEntryGate("official").catch((error) => ({
    allowed: false,
    reasons: [error instanceof Error ? error.message : "UNIFIED_LIVE_GATE_UNAVAILABLE"],
    mode: "MANAGE_ONLY" as const,
    positionManagementContinues: true,
  }));
  const newEntryGate = strategyActiveExecutionEnabled
    ? baseNewEntryGate
    : { ...baseNewEntryGate, allowed: false, reasons: [...baseNewEntryGate.reasons, "LEGACY_STRATEGY_EXECUTION_DISABLED"] };

  return NextResponse.json({
    migrationRequired: result.migrationRequired,
    account: result.account,
    scope: "OFFICIAL",
    officialControl: true,
    experimentCapitalUsdt: 1000,
    runtimeConfig,
    newEntryGate,
    bitgetReadiness: {
      mode: bitget.mode,
      configured: bitget.configured,
      executionAllowed: bitget.executionAllowed,
      liveConfirmationAccepted: bitget.liveConfirmationAccepted,
      initialCapitalUsdt: bitget.liveInitialCapitalUsdt,
      maxPositionNotionalUsdt: bitget.liveMaxPositionNotionalUsdt,
      maxConcurrentPositions: bitget.liveMaxConcurrentPositions,
      maxTradesPerDay: bitget.liveMaxTradesPerDay,
      strategyActiveExecutionEnabled,
    },
    strategyDiagnostics: strategyDashboard ? {
      generatedAt: strategyDashboard.generatedAt,
      databaseReady: strategyDashboard.databaseReady,
      executionEnvironmentAllowed: strategyDashboard.executionEnvironmentAllowed,
      risk: {
        blocked: strategyDashboard.risk.blocked,
        blockReason: strategyDashboard.risk.blockReason,
        dailyLossPct: strategyDashboard.risk.dailyLossPct,
        weeklyLossPct: strategyDashboard.risk.weeklyLossPct,
        openRiskPct: strategyDashboard.risk.openRiskPct,
        availableUsdt: strategyDashboard.risk.availableUsdt,
      },
      horizons: strategyDashboard.profiles.map((profile) => {
        const stats = strategyDashboard.stats.find((row) => row.strategyType === profile.strategyType);
        const recent = strategyDashboard.latestDecisions
          .filter((row) => row.strategyType === profile.strategyType)
          .slice(0, 4)
          .map((row) => ({
            symbol: row.symbol,
            status: row.status,
            direction: row.direction,
            rejectionReason: row.rejectionReason,
            updatedAt: row.updatedAt,
          }));
        return {
          strategyType: profile.strategyType,
          label: profile.label,
          lastScanAt: profile.lastScanAt,
          stats: stats ? {
            scansToday: stats.scansToday,
            symbolsEvaluatedToday: stats.symbolsEvaluatedToday,
            readyToday: stats.readyToday,
            blockedToday: stats.blockedToday,
            orderAttemptsToday: stats.orderAttemptsToday,
            openedToday: stats.openedToday,
          } : null,
          recent,
        };
      }),
    } : null,
  });
}
