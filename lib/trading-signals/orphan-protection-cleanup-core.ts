import type { UnifiedLiveExchangeOrder } from "@/types/unified-live-trading";

export type OrphanProtectionCleanupResult = {
  orderKey: string;
  status: "CONFIRMED" | "ACKNOWLEDGED" | "FAILED";
  error?: string;
};

export async function runOrphanProtectionCleanup(input: {
  orders: UnifiedLiveExchangeOrder[];
  cancel: (order: UnifiedLiveExchangeOrder) => Promise<{ status: "CONFIRMED" | "ACKNOWLEDGED" }>;
}): Promise<OrphanProtectionCleanupResult[]> {
  const results: OrphanProtectionCleanupResult[] = [];
  for (const order of input.orders) {
    try {
      const cancellation = await input.cancel(order);
      results.push({ orderKey: order.orderKey, status: cancellation.status });
    } catch (error) {
      results.push({
        orderKey: order.orderKey,
        status: "FAILED",
        error: error instanceof Error ? error.message : "取消孤立保护单失败",
      });
    }
  }
  return results;
}
