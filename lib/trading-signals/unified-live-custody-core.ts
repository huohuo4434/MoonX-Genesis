import { UNIFIED_LIVE_HORIZON_LIMITS } from "@/lib/trading-signals/unified-live-config";
import type {
  UnifiedLiveCustodyAudit,
  UnifiedLiveCustodyIssue,
  UnifiedLiveCustodySliceLike,
  UnifiedLiveExchangeOrder,
  UnifiedLiveExchangePosition,
} from "@/types/unified-live-trading";

function normalizeSymbol(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "").replace(/PERP$/, "");
}

function activeSlice(slice: UnifiedLiveCustodySliceLike): boolean {
  return ["PENDING", "OPEN", "PARTIALLY_CLOSED", "ORPHAN_PENDING_CLAIM"].includes(String(slice.status));
}

function positionMatchesSlice(position: UnifiedLiveExchangePosition, slice: UnifiedLiveCustodySliceLike): boolean {
  if (normalizeSymbol(position.symbol) !== normalizeSymbol(slice.symbol)) return false;
  if (position.side !== slice.side) return false;
  if (slice.exchangePositionKey && slice.exchangePositionKey === position.positionKey) return true;
  return true;
}

function normalizeSide(value: string | null | undefined): "LONG" | "SHORT" | null {
  const normalized = String(value ?? "").trim().toUpperCase();
  if (normalized === "LONG" || normalized === "BUY") return "LONG";
  if (normalized === "SHORT" || normalized === "SELL") return "SHORT";
  return null;
}

function protectionForPosition(orders: UnifiedLiveExchangeOrder[], position: UnifiedLiveExchangePosition) {
  const normalized = normalizeSymbol(position.symbol);
  const matching = orders.filter((order) =>
    normalizeSymbol(order.symbol) === normalized && normalizeSide(order.side) === position.side
  );
  return {
    stopLoss: matching.some((order) => order.stopLoss || /STOP.?LOSS|SL/i.test(String(order.status ?? ""))),
    takeProfit: matching.some((order) => order.takeProfit || /TAKE.?PROFIT|TP/i.test(String(order.status ?? ""))),
  };
}

export function auditUnifiedLiveCustody(input: {
  snapshotAvailable: boolean;
  positions: UnifiedLiveExchangePosition[];
  orders: UnifiedLiveExchangeOrder[];
  slices: UnifiedLiveCustodySliceLike[];
  now?: Date;
}): UnifiedLiveCustodyAudit {
  const now = input.now ?? new Date();
  const issues: UnifiedLiveCustodyIssue[] = [];
  const active = input.slices.filter(activeSlice);
  if (!input.snapshotAvailable) {
    issues.push({
      code: "SNAPSHOT_UNAVAILABLE",
      severity: "BLOCKER",
      detail: "Bitget read-only snapshot is unavailable; new entries are frozen while custody continues retrying.",
    });
  }

  const orphanPositions = input.positions.filter(
    (position) => !active.some((slice) => positionMatchesSlice(position, slice)),
  );
  for (const position of orphanPositions) {
    issues.push({
      code: "ORPHAN_EXCHANGE_POSITION",
      severity: "BLOCKER",
      symbol: position.symbol,
      positionKey: position.positionKey,
      detail: "Exchange position exists without a unified short/medium/long custody slice.",
    });
  }

  const settlementGraceMs = 2 * 60_000;
  const matchedPendingSlices = active.filter((slice) =>
    String(slice.status) === "PENDING"
    && input.positions.some((position) => positionMatchesSlice(position, slice))
  );
  const siteOnlySlices = active.filter((slice) => {
    if (input.positions.some((position) => positionMatchesSlice(position, slice))) return false;
    const openedAt = new Date(slice.openedAt).getTime();
    const pendingSettlement = String(slice.status) === "PENDING" && Number.isFinite(openedAt)
      && now.getTime() - openedAt < settlementGraceMs;
    return !pendingSettlement;
  });
  for (const slice of siteOnlySlices) {
    issues.push({
      code: "SITE_ONLY_POSITION",
      severity: "WARN",
      symbol: slice.symbol,
      sliceId: slice.id,
      detail: "Website custody slice is active but the exchange position is absent; treat as manual close candidate.",
    });
  }

  const unknownSideOrders = input.orders.filter((order) => !normalizeSide(order.side));
  for (const order of unknownSideOrders) {
    issues.push({
      code: "UNKNOWN_EXCHANGE_PROTECTION_SIDE",
      severity: "BLOCKER",
      symbol: order.symbol,
      detail: `Exchange protection ${order.orderKey} has an unknown side; it cannot protect a position or be auto-cancelled.`,
    });
  }

  const orphanOrders = input.orders.filter((order) => {
    const symbol = normalizeSymbol(order.symbol);
    const side = normalizeSide(order.side);
    // An unknown side is unsafe to auto-cancel. It remains outside the proven
    // protection match and therefore makes the real position fail closed.
    if (!side) return false;
    if (input.positions.some((position) => normalizeSymbol(position.symbol) === symbol && position.side === side)) return false;
    return !active.some((slice) => {
      if (normalizeSymbol(slice.symbol) !== symbol || slice.side !== side || String(slice.status) !== "PENDING") return false;
      const openedAt = new Date(slice.openedAt).getTime();
      return Number.isFinite(openedAt) && now.getTime() - openedAt < settlementGraceMs;
    });
  });
  for (const order of orphanOrders) {
    issues.push({
      code: "ORPHAN_EXCHANGE_PROTECTION",
      severity: "BLOCKER",
      symbol: order.symbol,
      detail: `Exchange protection ${order.orderKey} exists without a matching position; custody must cancel it idempotently before new exposure.`,
    });
  }

  const protectionMissing: string[] = [];
  for (const position of input.positions) {
    const protection = protectionForPosition(input.orders, position);
    if (!protection.stopLoss || !protection.takeProfit) {
      protectionMissing.push(position.positionKey);
      issues.push({
        code: "PROTECTION_MISSING",
        severity: "BLOCKER",
        symbol: position.symbol,
        positionKey: position.positionKey,
        detail: `Exchange protection incomplete: stopLoss=${protection.stopLoss}, takeProfit=${protection.takeProfit}.`,
      });
    }
  }

  const timeExitDue: string[] = [];
  for (const slice of active) {
    const opened = new Date(slice.openedAt);
    const configured = Number(slice.maxHoldMinutes) || UNIFIED_LIVE_HORIZON_LIMITS[slice.horizon];
    if (Number.isFinite(opened.getTime()) && now.getTime() - opened.getTime() >= configured * 60_000) {
      timeExitDue.push(slice.id);
      issues.push({
        code: "TIME_EXIT_DUE",
        severity: "BLOCKER",
        symbol: slice.symbol,
        sliceId: slice.id,
        detail: `${slice.horizon} maximum holding time has expired; custody must execute or supervise exit.`,
      });
    }
  }

  const duplicateKeys = new Map<string, UnifiedLiveCustodySliceLike[]>();
  for (const slice of active) {
    const key = `${normalizeSymbol(slice.symbol)}:${slice.side}:${slice.horizon}`;
    duplicateKeys.set(key, [...(duplicateKeys.get(key) ?? []), slice]);
  }
  for (const [key, duplicates] of duplicateKeys.entries()) {
    if (duplicates.length > 1) {
      issues.push({
        code: "DUPLICATE_SLICE",
        severity: "BLOCKER",
        detail: `Multiple active custody slices share ${key}.`,
      });
    }
  }

  return {
    collectedAt: now.toISOString(),
    snapshotAvailable: input.snapshotAvailable,
    issues,
    orphanPositions,
    orphanOrders,
    unknownSideOrders,
    matchedPendingSlices,
    siteOnlySlices,
    protectionMissing,
    timeExitDue,
    freezeNewEntries: issues.some((issue) => issue.severity === "BLOCKER"),
  };
}
