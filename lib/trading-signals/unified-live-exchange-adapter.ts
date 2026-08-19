import {
  getBitgetDemoCurrentPositions,
  getBitgetDemoPendingStrategyOrders,
} from "@/lib/bitget/demo-client";
import type {
  UnifiedLiveExchangeOrder,
  UnifiedLiveExchangePosition,
} from "@/types/unified-live-trading";

/**
 * MOOX V7.20.10.0
 * Unified custody must use the same authoritative UTA position/protection reads
 * as the live execution engine.  The previous admin-snapshot shape was a UI
 * aggregate and could report an empty position/order set without proving that
 * the exchange was actually empty.
 */
export async function readUnifiedLiveExchangeSnapshot(): Promise<{
  available: boolean;
  positions: UnifiedLiveExchangePosition[];
  orders: UnifiedLiveExchangeOrder[];
}> {
  try {
    const [positions, protections] = await Promise.all([
      getBitgetDemoCurrentPositions(),
      getBitgetDemoPendingStrategyOrders(),
    ]);

    return {
      available: true,
      positions: positions.map((position) => ({
        positionKey: `${position.symbol}:${position.posSide}`,
        symbol: position.symbol,
        side: position.posSide === "short" ? "SHORT" : "LONG",
        quantity: Math.abs(position.total),
        entryPrice: position.avgPrice,
        markPrice: position.markPrice,
        leverage: position.leverage,
        marginMode: position.marginMode,
        updatedAt: position.createdAt,
      })),
      orders: protections.map((order) => ({
        orderKey: order.orderId || order.clientOid,
        symbol: order.symbol,
        side: order.posSide,
        reduceOnly: true,
        stopLoss: order.stopLoss != null && order.stopLoss > 0,
        takeProfit: order.takeProfit != null && order.takeProfit > 0,
        status: "TPSL_PENDING",
      })),
    };
  } catch {
    // Fail closed.  The custody layer converts snapshot unavailability into a
    // blocker so no new position can be opened while exchange truth is unknown.
    return { available: false, positions: [], orders: [] };
  }
}
