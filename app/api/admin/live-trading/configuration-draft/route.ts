import { NextRequest, NextResponse } from "next/server";
import { isUnifiedLiveAdmin, resolveUnifiedLiveActor } from "@/lib/trading-signals/unified-live-auth";
import { getLiveConfigurationDraft, saveLiveConfigurationDraft } from "@/lib/trading-signals/live-configuration-draft-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store" };

export async function GET(request: NextRequest) {
  const authorization = await isUnifiedLiveAdmin(await resolveUnifiedLiveActor(request));
  if (!authorization) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404, headers });
  try { return NextResponse.json(await getLiveConfigurationDraft(), { headers }); }
  catch { return NextResponse.json({ error: "CONFIGURATION_UNAVAILABLE" }, { status: 503, headers }); }
}

export async function POST(request: NextRequest) {
  const actor = await resolveUnifiedLiveActor(request);
  const authorization = await isUnifiedLiveAdmin(actor);
  if (!actor || !authorization) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404, headers });
  if (request.headers.get("origin") !== new URL(request.url).origin
    || !request.headers.get("content-type")?.startsWith("application/json")) return NextResponse.json({ error: "INVALID_ORIGIN" }, { status: 403, headers });
  try {
    const text = await request.text();
    if (text.length > 4096) return NextResponse.json({ error: "INVALID_CONFIGURATION" }, { status: 400, headers });
    const payload = JSON.parse(text);
    if (!payload || typeof payload !== "object" || Array.isArray(payload)
      || Object.keys(payload).some((key) => !["draft", "expectedRevision", "requestId"].includes(key))) throw new Error("INVALID_CONFIGURATION");
    if (!payload.draft || typeof payload.draft !== "object" || Array.isArray(payload.draft)
      || !("leverage" in payload.draft)) throw new Error("INVALID_CONFIGURATION");
    const saved = await saveLiveConfigurationDraft({ draft: payload.draft, expectedRevision: payload.expectedRevision, requestId: payload.requestId, actorId: actor.id });
    return NextResponse.json(saved, { headers });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "CONFIGURATION_CONFLICT") return NextResponse.json({ error: code }, { status: 409, headers });
    if (/^INVALID_(CONFIGURATION|BUDGET|DURATION|LEVERAGE)$/.test(code) || error instanceof SyntaxError) return NextResponse.json({ error: "INVALID_CONFIGURATION" }, { status: 400, headers });
    return NextResponse.json({ error: "CONFIGURATION_UNAVAILABLE" }, { status: 503, headers });
  }
}
