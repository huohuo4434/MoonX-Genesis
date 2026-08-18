import type {
  UnifiedLiveExchangeOrder,
  UnifiedLiveExchangePosition,
  UnifiedLiveSide,
} from "@/types/unified-live-trading";

type UnknownRecord = Record<string, unknown>;
type UnknownFn = (...args: unknown[]) => unknown;

function record(value: unknown): UnknownRecord | null {
  return value && typeof value === "object" ? (value as UnknownRecord) : null;
}

function numberValue(...values: unknown[]): number | null {
  for (const value of values) {
    const parsed = typeof value === "number" ? value : Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function stringValue(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function sideValue(value: unknown): UnifiedLiveSide | null {
  const text = String(value ?? "").toUpperCase();
  if (/LONG|BUY/.test(text)) return "LONG";
  if (/SHORT|SELL/.test(text)) return "SHORT";
  return null;
}

function findArrays(value: unknown, keyPattern: RegExp, depth = 0): unknown[][] {
  if (depth > 6 || value == null) return [];
  if (Array.isArray(value)) return [value];
  const obj = record(value);
  if (!obj) return [];
  const direct: unknown[][] = [];
  for (const [key, child] of Object.entries(obj)) {
    if (Array.isArray(child) && keyPattern.test(key)) direct.push(child);
    else direct.push(...findArrays(child, keyPattern, depth + 1));
  }
  return direct;
}

async function invokeSnapshotModule(): Promise<unknown> {
  const snapshotModule = (await import("@/lib/bitget/live-admin-snapshot")) as UnknownRecord;
  const preferred = [
    "getBitgetLiveAdminSnapshot",
    "buildBitgetLiveAdminSnapshot",
    "loadBitgetLiveAdminSnapshot",
    "getLiveAdminSnapshot",
    "getLiveSnapshot",
  ];
  const candidates: Array<[string, unknown]> = [
    ...preferred.map((name) => [name, snapshotModule[name]] as [string, unknown]),
    ...Object.entries(snapshotModule).filter(([name, value]) => typeof value === "function" && /snapshot|status/i.test(name)),
  ];
  const seen = new Set<unknown>();
  for (const [, value] of candidates) {
    if (typeof value !== "function" || seen.has(value)) continue;
    seen.add(value);
    const fn = value as UnknownFn;
    try {
      const result = await fn();
      if (result) return result;
    } catch {
      // Read-only adapter fails closed; the caller freezes new entries.
    }
  }
  return null;
}

export async function readUnifiedLiveExchangeSnapshot() {
  const raw = await invokeSnapshotModule();
  if (!raw) return { available: false, positions: [] as UnifiedLiveExchangePosition[], orders: [] as UnifiedLiveExchangeOrder[] };

  const positionArrays = findArrays(raw, /positions?|openPositions?|exchangePositions?/i);
  const positions: UnifiedLiveExchangePosition[] = [];
  for (const item of positionArrays.flat()) {
    const obj = record(item);
    if (!obj) continue;
    const symbol = stringValue(obj.symbol, obj.instId, obj.productId, obj.marketCode);
    const side = sideValue(obj.holdSide ?? obj.side ?? obj.positionSide ?? obj.direction);
    const quantity = numberValue(obj.total, obj.size, obj.quantity, obj.positionSize, obj.available);
    const entryPrice = numberValue(obj.openPriceAvg, obj.entryPrice, obj.averageOpenPrice, obj.avgPrice);
    if (!symbol || !side || !quantity || !entryPrice || quantity === 0) continue;
    const key = stringValue(obj.positionId, obj.posId, obj.id, obj.clientOid) ?? `${symbol}:${side}`;
    positions.push({
      positionKey: key,
      symbol,
      side,
      quantity: Math.abs(quantity),
      entryPrice,
      markPrice: numberValue(obj.markPrice, obj.marketPrice, obj.lastPrice),
      leverage: numberValue(obj.leverage),
      marginMode: stringValue(obj.marginMode, obj.marginCoin, obj.posMode),
      updatedAt: stringValue(obj.updatedAt, obj.uTime, obj.cTime),
    });
  }

  const orderArrays = findArrays(raw, /orders?|planOrders?|strategyOrders?|protection/i);
  const orders: UnifiedLiveExchangeOrder[] = [];
  for (const item of orderArrays.flat()) {
    const obj = record(item);
    if (!obj) continue;
    const symbol = stringValue(obj.symbol, obj.instId, obj.productId);
    if (!symbol) continue;
    const typeText = String(obj.orderType ?? obj.planType ?? obj.triggerType ?? obj.type ?? "").toUpperCase();
    const orderKey = stringValue(obj.orderId, obj.planOrderId, obj.id, obj.clientOid) ?? `${symbol}:${orders.length}`;
    orders.push({
      orderKey,
      symbol,
      side: stringValue(obj.side, obj.holdSide),
      reduceOnly: Boolean(obj.reduceOnly) || /REDUCE|CLOSE/.test(typeText),
      stopLoss: /STOP.?LOSS|LOSS_PLAN|SL/.test(typeText) || Boolean(obj.stopLossPrice ?? obj.stopSurplusTriggerPrice),
      takeProfit: /TAKE.?PROFIT|PROFIT_PLAN|TP/.test(typeText) || Boolean(obj.takeProfitPrice ?? obj.stopLossTriggerPrice),
      status: stringValue(obj.status, obj.state, obj.orderType, obj.planType),
    });
  }

  const uniquePositions = Array.from(new Map(positions.map((position) => [position.positionKey, position])).values());
  const uniqueOrders = Array.from(new Map(orders.map((order) => [order.orderKey, order])).values());
  return { available: true, positions: uniquePositions, orders: uniqueOrders };
}
