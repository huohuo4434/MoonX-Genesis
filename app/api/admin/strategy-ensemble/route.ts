import { NextRequest, NextResponse } from "next/server";
import { isUnifiedLiveAdmin, resolveUnifiedLiveActor } from "@/lib/trading-signals/unified-live-auth";
import { buildStrategyEnsembleSnapshot } from "@/lib/trading-signals/strategy-ensemble";
import { approveStrategyEnsembleCandidate, listStrategyEnsembleHistory, persistStrategyEnsembleSnapshot } from "@/lib/trading-signals/strategy-ensemble-store";
import type { StrategyEnsembleCandidate } from "@/types/strategy-ensemble";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function authorized(request: NextRequest) {
  const actor = await resolveUnifiedLiveActor(request);
  return (await isUnifiedLiveAdmin(actor)) ? actor : null;
}

export async function GET(request: NextRequest) {
  if (!(await authorized(request))) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  const [snapshot, history] = await Promise.all([
    buildStrategyEnsembleSnapshot(),
    listStrategyEnsembleHistory("official", 120),
  ]);
  return NextResponse.json({ snapshot, history });
}

export async function POST(request: NextRequest) {
  if (!(await authorized(request))) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  const body = (await request.json().catch(() => null)) as { action?: string; candidate?: StrategyEnsembleCandidate } | null;
  const action = String(body?.action ?? "").toUpperCase();
  if (action === "RUN_NOW") {
    const snapshot = await buildStrategyEnsembleSnapshot();
    const persisted = await persistStrategyEnsembleSnapshot(snapshot, "official");
    return NextResponse.json({ ok: true, snapshot, persisted });
  }
  if (action === "APPROVE") {
    const candidate = body?.candidate;
    if (!candidate || !candidate.id || !candidate.symbol || !candidate.sleeve) return NextResponse.json({ error: "INVALID_CANDIDATE" }, { status: 400 });
    if (!candidate.eligibleForApproval || candidate.side === "WAIT") return NextResponse.json({ error: "CANDIDATE_NOT_APPROVABLE" }, { status: 409 });
    const result = await approveStrategyEnsembleCandidate(candidate, "official");
    return NextResponse.json({ ok: true, result, execution: "ADMIN_CONFIRMATION_REQUIRED" });
  }
  return NextResponse.json({ error: "UNKNOWN_ACTION" }, { status: 400 });
}
