import { NextRequest, NextResponse } from "next/server";
import { resolveUnifiedLiveActor } from "@/lib/trading-signals/unified-live-auth";
import { ensureUnifiedLiveAccount, getUnifiedLiveAccount } from "@/lib/trading-signals/unified-live-store";
import { runUnifiedLiveCustodyCycle } from "@/lib/trading-signals/unified-live-runtime";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const actor = await resolveUnifiedLiveActor(request);
  if (!actor) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const ownerKey = `member:${actor.id}`;
  const ensured = await ensureUnifiedLiveAccount({ ownerKey, accountScope: "MEMBER", displayName: actor.email });
  if (!ensured.ok) return NextResponse.json({ migrationRequired: true, account: null });
  await runUnifiedLiveCustodyCycle({ trigger: "MEMBER_STATUS", ownerKey });
  const result = await getUnifiedLiveAccount(ownerKey);
  return NextResponse.json({ migrationRequired: result.migrationRequired, account: result.account });
}
