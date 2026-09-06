import { prisma } from "@/lib/prisma";
import { readBitgetContinuousTransitionSnapshot } from "@/lib/bitget/demo-client";
import { assertContinuousTransition, CONTINUOUS_EVENT, type ContinuousTransitionRow } from "@/lib/bitget/live-continuous-transition-core";

// Prepares duration only. This function never grants account new-entry permission.
export async function prepareContinuousDuration(actorId: string) {
  return evaluateContinuousDuration(actorId, false);
}

// Same gates, no lifecycle/event writes. A passing check is not permission to trade.
export async function inspectContinuousDuration(actorId: string) {
  return evaluateContinuousDuration(actorId, true);
}

async function evaluateContinuousDuration(actorId: string, readOnly: boolean) {
  if (!prisma || !actorId) throw new Error("TRANSITION_UNAVAILABLE");
  const snapshot = await readBitgetContinuousTransitionSnapshot();
  return prisma.$transaction(async tx => {
    const accounts = await tx.$queryRaw<Array<{ id: string; mode: string; newEntriesEnabled: boolean; positionManagementEnabled: boolean }>>`
      SELECT id, mode, "newEntriesEnabled", "positionManagementEnabled" FROM "MooxUnifiedLiveAccount"
      WHERE "ownerKey"='official' FOR UPDATE NOWAIT
    `;
    const account = accounts[0];
    if (account?.mode !== "MANAGE_ONLY" || account.newEntriesEnabled !== false || account.positionManagementEnabled !== true) throw new Error("MANAGE_ONLY_REQUIRED");
    // Serialize with the server runtime lease; an expired non-null owner is still uncertain.
    const runtime = await tx.$queryRaw<Array<{ run_lock_until: Date | null; run_lock_owner: string | null }>>`
      SELECT run_lock_until, run_lock_owner FROM trade_bitget_runtime_state WHERE id='default' FOR UPDATE NOWAIT
    `;
    if (!runtime[0] || runtime[0].run_lock_until !== null || runtime[0].run_lock_owner !== null) throw new Error("RUNTIME_BUSY");
    const rows = await tx.$queryRaw<Array<ContinuousTransitionRow & { entry_epoch_at: Date | null }>>`
      SELECT * FROM trade_bitget_live_experiment WHERE id='default' FOR UPDATE NOWAIT
    `;
    const row = rows[0];
    if (!row) throw new Error("TRANSITION_UNAVAILABLE");
    if (row.status === "ACTIVE" && row.duration_mode === "CONTINUOUS" && row.ends_at === null && row.entry_epoch_at) {
      return { ok: true, durationMode: "CONTINUOUS", newEntriesEnabled: false, alreadyApplied: true };
    }
    const unsettled = await tx.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) AS count FROM trade_execution_outbox WHERE environment_mode='LIVE_EXPERIMENT'
      AND (status IN ('PENDING','PROCESSING','ACKNOWLEDGED') OR (status='FAILED' AND attempt_count<max_attempts))
    `;
    const decisions = await tx.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) AS count FROM trade_three_horizon_decisions WHERE status IN ('ORDER_SUBMITTED','OPEN','PARTIAL','CLOSING')
    `;
    const slices = await tx.mooxUnifiedLiveSlice.count({ where: { accountId: account.id, status: { in: ["OPEN", "PARTIAL", "CLOSING"] } } });
    if (!unsettled[0] || !decisions[0] || Number(unsettled[0].count) !== 0 || Number(decisions[0].count) !== 0 || slices !== 0) throw new Error("UNSETTLED_WORK");
    const now = new Date();
    const date = new Date(now.getTime() + 8 * 60 * 60_000).toISOString().slice(0, 10);
    const daily = await tx.$queryRaw<Array<{ opening_equity_usdt: number }>>`
      SELECT opening_equity_usdt FROM trade_bitget_live_daily_snapshots WHERE trade_date=${date}::date
    `;
    if (!daily[0]) throw new Error("RISK_EVIDENCE_INVALID");
    assertContinuousTransition({ ...snapshot, now, row, openingEquity: daily[0].opening_equity_usdt });
    if (readOnly) return { ok: true, readOnly: true, readyToPrepare: true, newEntriesEnabled: false };
    const changed = await tx.$executeRaw`
      UPDATE trade_bitget_live_experiment SET duration_mode='CONTINUOUS', ends_at=NULL,
      status='ACTIVE', entry_epoch_at=${now}, stop_reason='', updated_at=NOW() WHERE id='default' AND status='COMPLETED'
    `;
    if (changed !== 1) throw new Error("TRANSITION_CONFLICT");
    await tx.mooxUnifiedLiveEvent.create({ data: {
      accountId: account.id, code: CONTINUOUS_EVENT, severity: "INFO",
      detail: JSON.stringify({ actorId, original: row, durationMode: "CONTINUOUS", entryEpochAt: now.toISOString(),
        snapshot, newEntriesEnabled: false, riskBaselinesPreserved: true }),
    } });
    return { ok: true, durationMode: "CONTINUOUS", newEntriesEnabled: false, alreadyApplied: false };
  }, { timeout: 5000 });
}
