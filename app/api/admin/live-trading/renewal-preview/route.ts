import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveUnifiedLiveActor, isUnifiedLiveAdmin } from "@/lib/trading-signals/unified-live-auth";
import { getBitgetDemoEnvironment } from "@/lib/bitget/demo-client";
import { buildLiveRenewalPreview, type LiveRenewalPreviewInput } from "@/lib/trading-signals/live-renewal-preview-core";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const authorization = await isUnifiedLiveAdmin(await resolveUnifiedLiveActor(request));
  if (!authorization) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  const environment = getBitgetDemoEnvironment();
  if (environment.mode !== "LIVE_EXPERIMENT") return NextResponse.json({ error: "NOT_LIVE_EXPERIMENT" }, { status: 409 });
  const now = new Date();
  const day = new Date(now.getTime() + 8 * 60 * 60_000).toISOString().slice(0, 10);
  let evidence: LiveRenewalPreviewInput = {};
  try {
    if (prisma) {
      const rows = await prisma.$queryRaw<LiveRenewalPreviewInput[]>`
        SELECT
          (SELECT row_to_json(e) FROM (
            SELECT status, started_at, ends_at, initial_equity_usdt, peak_equity_usdt, max_drawdown_usdt
            FROM trade_bitget_live_experiment WHERE id = 'default' LIMIT 1
          ) e) AS experiment,
          (SELECT row_to_json(r) FROM (
            SELECT paused, run_lock_until, last_heartbeat_at, account_snapshot
            FROM trade_bitget_runtime_state WHERE id = 'default' LIMIT 1
          ) r) AS runtime,
          (SELECT row_to_json(d) FROM (
            SELECT trade_date, opening_equity_usdt FROM trade_bitget_live_daily_snapshots
            WHERE trade_date = ${day}::date LIMIT 1
          ) d) AS today,
          (SELECT COUNT(*)::int FROM trade_execution_outbox WHERE environment_mode = 'LIVE_EXPERIMENT'
            AND (status IN ('PENDING','PROCESSING','ACKNOWLEDGED') OR (status = 'FAILED' AND attempt_count < max_attempts))) AS "pendingExecutions",
          (SELECT COUNT(*)::int FROM trade_execution_outbox WHERE environment_mode = 'LIVE_EXPERIMENT' AND status = 'FAILED') AS "failedExecutions"
      `;
      evidence = rows[0] ?? {};
    }
  } catch {
    // Unknown evidence is not an empty account. Never expose raw DB diagnostics.
  }
  return NextResponse.json(buildLiveRenewalPreview({
    ...evidence, dailyLossLimit: environment.liveDailyLossUsdt, drawdownLimit: environment.liveMaxDrawdownUsdt,
  }, new Date()), { headers: { "Cache-Control": "no-store" } });
}
