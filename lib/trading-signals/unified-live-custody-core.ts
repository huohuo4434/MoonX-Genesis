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

function protectionForSymbol(orders: UnifiedLiveExchangeOrder[], symbol: string) {
  const normalized = normalizeSymbol(symbol);
  const matching = orders.filter((order) => normalizeSymbol(order.symbol) === normalized);
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

  const protectionMissing: string[] = [];
  for (const position of input.positions) {
    const protection = protectionForSymbol(input.orders, position.symbol);
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
    siteOnlySlices,
    protectionMissing,
    timeExitDue,
    freezeNewEntries: issues.some((issue) => issue.severity === "BLOCKER"),
  };
}
