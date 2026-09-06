import { NextRequest, NextResponse } from "next/server";
import { isUnifiedLiveAdmin, resolveUnifiedLiveActor } from "@/lib/trading-signals/unified-live-auth";
import { inspectContinuousDuration, prepareContinuousDuration } from "@/lib/trading-signals/live-continuous-transition-store";
import { CONTINUOUS_CONFIRMATION } from "@/lib/bitget/live-continuous-transition-core";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;
const headers = { "Cache-Control": "no-store" };
function failure(error: unknown, readOnly: boolean) {
  const code = error instanceof Error ? error.message : "";
  const known = /^(MANAGE_ONLY_REQUIRED|RUNTIME_BUSY|UNSETTLED_WORK|NOT_EXPIRY_COMPLETED|SNAPSHOT_STALE|RISK_EVIDENCE_INVALID|RISK_LIMIT_REACHED|EXCHANGE_UNKNOWN|EXCHANGE_NOT_EMPTY|EXCHANGE_SECURITY_INVALID|LIVE_CONFIG_INVALID|TRANSITION_CONFLICT)$/.test(code);
  const safeCode = known ? code : "TRANSITION_UNAVAILABLE";
  // Never log upstream messages, credentials, request bodies or account payloads.
  console.warn("[continuous-duration]", { readOnly, code: safeCode });
  return NextResponse.json({ error: safeCode, readOnly }, { status: known ? 409 : 503, headers });
}
export async function GET(request: NextRequest) {
  const actor = await resolveUnifiedLiveActor(request);
  if (!actor || !await isUnifiedLiveAdmin(actor)) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404, headers });
  try {
    return NextResponse.json({ ...await inspectContinuousDuration(actor.id), readOnly: true }, { headers });
  } catch (error) { return failure(error, true); }
}
export async function POST(request: NextRequest) {
  const actor = await resolveUnifiedLiveActor(request);
  const authorization = actor ? await isUnifiedLiveAdmin(actor) : false;
  if (!actor || !authorization) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404, headers });
  if (request.headers.get("origin") !== new URL(request.url).origin
    || !request.headers.get("content-type")?.startsWith("application/json")) return NextResponse.json({ error: "INVALID_ORIGIN" }, { status: 403, headers });
  try {
    const text = await request.text();
    if (text.length > 256) throw new Error("INVALID_CONFIRMATION");
    const payload = JSON.parse(text);
    if (!payload || typeof payload !== "object" || Array.isArray(payload) || Object.keys(payload).length !== 1
      || payload.confirmation !== CONTINUOUS_CONFIRMATION) throw new Error("INVALID_CONFIRMATION");
    return NextResponse.json(await prepareContinuousDuration(actor.id), { headers });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "INVALID_CONFIRMATION" || error instanceof SyntaxError) return NextResponse.json({ error: "INVALID_CONFIRMATION" }, { status: 400, headers });
    return failure(error, false);
  }
}
