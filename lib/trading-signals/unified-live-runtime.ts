import { auditUnifiedLiveCustody } from "@/lib/trading-signals/unified-live-custody-core";
import { readUnifiedLiveExchangeSnapshot } from "@/lib/trading-signals/unified-live-exchange-adapter";
import { readUnifiedLiveRuntimeConfig } from "@/lib/trading-signals/unified-live-config";
import {
  ensureUnifiedLiveAccount,
  getUnifiedLiveAccount,
  markUnifiedLiveManualClosures,
  recordUnifiedLiveEvents,
  setUnifiedLiveMode,
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

  const exchange = await readUnifiedLiveExchangeSnapshot();
  const stored = await getUnifiedLiveAccount(ownerKey);
  const slices = (stored.account?.slices ?? []).map((slice: StoredUnifiedLiveSlice) => ({
    id: slice.id,
    symbol: slice.symbol,
    horizon: slice.horizon as "SHORT" | "MEDIUM" | "LONG",
    side: slice.side as "LONG" | "SHORT",
    status: slice.status,
    quantity: slice.quantity,
    openedAt: slice.openedAt,
    maxHoldMinutes: slice.maxHoldMinutes,
    exchangePositionKey: slice.exchangePositionKey,
  }));
  const audit = auditUnifiedLiveCustody({
    snapshotAvailable: exchange.available,
    positions: exchange.positions,
    orders: exchange.orders,
    slices,
  });

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
  if (audit.freezeNewEntries && stored.account?.newEntriesEnabled) {
    await setUnifiedLiveMode({
      ownerKey,
      mode: "MANAGE_ONLY",
      newEntriesEnabled: false,
      positionManagementEnabled: true,
    });
  }
  return {
    ok: true,
    migrationRequired: false,
    trigger: input.trigger,
    mode: audit.freezeNewEntries ? "MANAGE_ONLY" : stored.account?.mode ?? config.mode,
    newOrdersPlaced: 0,
    positionManagementContinues: config.positionManagementEnabled,
    exchangePositions: exchange.positions,
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
  const stored = await getUnifiedLiveAccount(ownerKey);
  if (stored.migrationRequired || !stored.account) {
    return {
      migrationRequired: stored.migrationRequired,
      account: stored.account,
      audit: null as UnifiedLiveCustodyAudit | null,
      exchangePositions: [],
    };
  }
  const exchange = await readUnifiedLiveExchangeSnapshot();
  const slices = stored.account.slices.map((slice: StoredUnifiedLiveSlice) => ({
    id: slice.id,
    symbol: slice.symbol,
    horizon: slice.horizon as "SHORT" | "MEDIUM" | "LONG",
    side: slice.side as "LONG" | "SHORT",
    status: slice.status,
    quantity: slice.quantity,
    openedAt: slice.openedAt,
    maxHoldMinutes: slice.maxHoldMinutes,
    exchangePositionKey: slice.exchangePositionKey,
  }));
  const audit = auditUnifiedLiveCustody({
    snapshotAvailable: exchange.available,
    positions: exchange.positions,
    orders: exchange.orders,
    slices,
  });
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
