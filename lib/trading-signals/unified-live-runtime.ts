import { auditUnifiedLiveCustody } from "@/lib/trading-signals/unified-live-custody-core";
import { readUnifiedLiveExchangeSnapshot } from "@/lib/trading-signals/unified-live-exchange-adapter";
import { readUnifiedLiveRuntimeConfig } from "@/lib/trading-signals/unified-live-config";
import {
  ensureUnifiedLiveAccount,
  freezeUnifiedLiveEntries,
  getUnifiedLiveAccount,
  getUnifiedLiveAuthorityVersion,
  markUnifiedLiveManualClosures,
  markUnifiedLivePendingSlicesOpen,
  recordUnifiedLiveEvents,
} from "@/lib/trading-signals/unified-live-store";
import type { UnifiedLiveCustodyAudit } from "@/types/unified-live-trading";
import { cancelBitgetDemoStrategyOrder } from "@/lib/bitget/demo-client";
import { runOrphanProtectionCleanup } from "@/lib/trading-signals/orphan-protection-cleanup-core";

type StoredUnifiedLiveSlice = {
  id: string;
  symbol: string;
  horizon: string;
  side: string;
  status: string;
  quantity: number;
  openedAt: Date;
  maxHoldMinutes: number;
  exchangePositionKey: string | null;
};

async function readConfirmedUnifiedLiveCustody(ownerKey: string) {
  const readOnce = async () => {
    // Fence authority BEFORE exchange IO; a later user click must win over this read.
    const freezeAuthority = await getUnifiedLiveAuthorityVersion(ownerKey);
    // Read the ledger AFTER the exchange: new fills can register while GETs run.
    const exchange = await readUnifiedLiveExchangeSnapshot();
    const stored = await getUnifiedLiveAccount(ownerKey);
    const slices = (stored.account?.slices ?? []).map((slice: StoredUnifiedLiveSlice) => ({
      ...slice,
      horizon: slice.horizon as "SHORT" | "MEDIUM" | "LONG",
      side: slice.side as "LONG" | "SHORT",
    }));
    const audit = stored.account ? auditUnifiedLiveCustody({
      snapshotAvailable: exchange.available,
      positions: exchange.positions,
      orders: exchange.orders,
      slices,
    }) : null;
    return { exchange, stored, audit, freezeAuthority };
  };
  const first = await readOnce();
  // Only suspect/transition snapshots incur extra GETs. This reduces read skew;
  // it is not an execution lock. Unknown or persistent anomalies still block.
  if (first.audit?.snapshotAvailable
    && (first.audit.issues.length || first.audit.matchedPendingSlices.length)) {
    const confirmed = await readOnce();
    // A different anomaly in the second snapshot is not a repeated observation.
    // It still blocks this execution via audit.freezeNewEntries; only stable
    // anomalies (or unavailable snapshots) persistently suspend the account.
    const key = (issue: NonNullable<typeof first.audit>["issues"][number]) =>
      JSON.stringify([issue.code, issue.symbol, issue.positionKey, issue.sliceId]);
    const firstBlockers = new Set(first.audit.issues.filter(i => i.severity === "BLOCKER").map(key));
    const persistentBlockers = confirmed.audit?.issues.filter(i => i.severity === "BLOCKER"
      && (i.code === "SNAPSHOT_UNAVAILABLE" || firstBlockers.has(key(i)))) ?? [];
    return { ...confirmed, persistentBlockers };
  }
  return { ...first, persistentBlockers: first.audit?.issues.filter(i => i.severity === "BLOCKER") ?? [] };
}

export async function runUnifiedLiveCustodyCycle(input: {
  trigger: string;
  ownerKey?: string;
}) {
  const ownerKey = input.ownerKey ?? "official";
  const ensured = await ensureUnifiedLiveAccount({ ownerKey, accountScope: ownerKey === "official" ? "OFFICIAL" : "MEMBER" });
  if (!ensured.ok) {
    return {
      ok: false,
      migrationRequired: true,
      trigger: input.trigger,
      mode: "MANAGE_ONLY",
      newOrdersPlaced: 0,
      positionManagementContinues: false,
      audit: null,
    };
  }

  const { exchange, stored, audit, freezeAuthority, persistentBlockers } = await readConfirmedUnifiedLiveCustody(ownerKey);
  if (!audit || !stored.account) throw new Error("UNIFIED_LIVE_CUSTODY_ACCOUNT_UNAVAILABLE");

  if (audit.snapshotAvailable && audit.matchedPendingSlices.length) {
    await markUnifiedLivePendingSlicesOpen(ownerKey, audit.matchedPendingSlices.map((slice) => slice.id));
  }
  if (audit.snapshotAvailable && audit.siteOnlySlices.length) {
    await markUnifiedLiveManualClosures(ownerKey, audit.siteOnlySlices.map((slice) => slice.id));
  }
  const orphanOrderCleanup = audit.snapshotAvailable
    ? await runOrphanProtectionCleanup({
        orders: audit.orphanOrders,
        cancel: (order) => cancelBitgetDemoStrategyOrder({
          orderId: order.orderId ?? undefined,
          clientOid: order.clientOid ?? undefined,
          symbol: order.symbol,
        }),
      })
    : [];
  await recordUnifiedLiveEvents(ownerKey, audit.issues);

  const config = readUnifiedLiveRuntimeConfig();
  let currentAccount = stored.account;
  if (persistentBlockers.length && stored.account?.newEntriesEnabled && freezeAuthority?.id === stored.account.id) {
    await freezeUnifiedLiveEntries({
      accountId: stored.account.id,
      updatedAt: freezeAuthority.updatedAt,
      trigger: input.trigger,
      reason: persistentBlockers
        .map((issue) => `${issue.code}${issue.symbol ? `(${issue.symbol})` : ""}`).join(", "),
    });
    const refreshed = await getUnifiedLiveAccount(ownerKey);
    if (!refreshed.account) throw new Error("UNIFIED_LIVE_CUSTODY_ACCOUNT_UNAVAILABLE");
    currentAccount = refreshed.account;
  }
  return {
    ok: true,
    migrationRequired: false,
    trigger: input.trigger,
    mode: currentAccount.mode,
    newOrdersPlaced: 0,
    positionManagementContinues: currentAccount.positionManagementEnabled && config.positionManagementEnabled,
    exchangePositions: exchange.positions,
    settledPendingSlices: audit.snapshotAvailable ? audit.matchedPendingSlices.map((slice) => slice.id) : [],
    orphanOrderCleanup,
    audit,
  };
}

/**
 * Read-only custody inspection for GET/status surfaces. It performs exchange
 * GETs and the pure audit only; it never creates accounts, closes slices,
 * records events, or changes the account mode.
 */
export async function inspectUnifiedLiveCustody(ownerKey = "official") {
  const { exchange, stored, audit } = await readConfirmedUnifiedLiveCustody(ownerKey);
  if (stored.migrationRequired || !stored.account) {
    return {
      migrationRequired: stored.migrationRequired,
      account: stored.account,
      audit: null as UnifiedLiveCustodyAudit | null,
      exchangePositions: [],
    };
  }
  return {
    migrationRequired: false,
    account: stored.account,
    audit,
    exchangePositions: exchange.positions,
  };
}

export async function getUnifiedLiveRuntimeStatus(ownerKey = "official") {
  const ensured = await ensureUnifiedLiveAccount({ ownerKey, accountScope: ownerKey === "official" ? "OFFICIAL" : "MEMBER" });
  if (!ensured.ok) return { migrationRequired: true, account: null, audit: null as UnifiedLiveCustodyAudit | null };
  const custody = await runUnifiedLiveCustodyCycle({ trigger: "STATUS_READ", ownerKey });
  const stored = await getUnifiedLiveAccount(ownerKey);
  return { migrationRequired: false, account: stored.account, audit: custody.audit };
}
