import type { UnifiedLiveExchangeOrder } from "@/types/unified-live-trading";

export function mapUnifiedLiveProtectionOrder(input: {
  orderId: string;
  clientOid: string;
  symbol: string;
  posSide: "long" | "short" | null;
  stopLoss: number | null;
  takeProfit: number | null;
}): UnifiedLiveExchangeOrder {
  return {
    orderKey: input.orderId || input.clientOid,
    orderId: input.orderId,
    clientOid: input.clientOid,
    symbol: input.symbol,
    side: input.posSide,
    reduceOnly: true,
    stopLoss: input.stopLoss != null && input.stopLoss > 0,
    takeProfit: input.takeProfit != null && input.takeProfit > 0,
    status: "TPSL_PENDING",
  };
}
