import { NextRequest, NextResponse } from "next/server";
import { resolveUnifiedLiveActor } from "@/lib/trading-signals/unified-live-auth";
import { ensureUnifiedLiveAccount, saveUnifiedLiveSettings } from "@/lib/trading-signals/unified-live-store";
import type { UnifiedLiveHorizonSetting } from "@/types/unified-live-trading";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function validateSettings(value: unknown): UnifiedLiveHorizonSetting[] | null {
  if (!Array.isArray(value) || value.length !== 3) return null;
  const horizons = new Set(["SHORT", "MEDIUM", "LONG"]);
  const modes = new Set(["FIXED_MARGIN", "EQUITY_PERCENT", "FIXED_NOTIONAL", "RISK_PERCENT"]);
  const rows: UnifiedLiveHorizonSetting[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") return null;
    const row = item as Record<string, unknown>;
    const horizon = String(row.horizon) as UnifiedLiveHorizonSetting["horizon"];
    const sizingMode = String(row.sizingMode) as UnifiedLiveHorizonSetting["sizingMode"];
    const leverage = Math.trunc(Number(row.leverage));
    if (!horizons.has(horizon) || !modes.has(sizingMode) || leverage < 1 || leverage > 10) return null;
    rows.push({
      horizon,
      enabled: Boolean(row.enabled),
      sizingMode,
      sizingValue: Math.max(0.01, Number(row.sizingValue)),
      leverage,
      maxOpenPositions: Math.min(20, Math.max(1, Math.trunc(Number(row.maxOpenPositions) || 1))),
      maxLossPercent: Math.min(10, Math.max(0.01, Number(row.maxLossPercent) || 0.5)),
      dailyLossPercent: Math.min(20, Math.max(0.1, Number(row.dailyLossPercent) || 1)),
      weeklyLossPercent: Math.min(50, Math.max(0.1, Number(row.weeklyLossPercent) || 2.5)),
      maxMarginUsePercent: Math.min(100, Math.max(1, Number(row.maxMarginUsePercent) || 25)),
      target1ReducePercent: Math.min(100, Math.max(1, Number(row.target1ReducePercent) || 30)),
      isolatedMargin: true,
    });
  }
  return rows;
}

export async function POST(request: NextRequest) {
  const actor = await resolveUnifiedLiveActor(request);
  if (!actor) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const settings = validateSettings(payload?.settings);
  if (!settings) return NextResponse.json({ error: "INVALID_SETTINGS" }, { status: 400 });
  const ownerKey = `member:${actor.id}`;
  const ensured = await ensureUnifiedLiveAccount({ ownerKey, accountScope: "MEMBER", displayName: actor.email });
  if (!ensured.ok) return NextResponse.json({ migrationRequired: true }, { status: 503 });
  return NextResponse.json(await saveUnifiedLiveSettings(ownerKey, settings));
}
