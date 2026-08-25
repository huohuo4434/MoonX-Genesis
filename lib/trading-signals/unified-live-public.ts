import { listPublicUnifiedLiveSlices } from "@/lib/trading-signals/unified-live-store";

export async function getPublicUnifiedLiveSnapshot() {
  const slices = await listPublicUnifiedLiveSlices();
  const mapRecord = (slice: (typeof slices.active)[number]) => ({
    id: slice.id,
    symbol: slice.symbol,
    horizon: slice.horizon,
    side: slice.side,
    status: slice.status,
    leverage: slice.leverage,
    entryPrice: slice.entryPrice,
    stopPrice: slice.stopPrice,
    target1: slice.target1,
    target2: slice.target2,
    qimenDirection: slice.qimenDirection,
    liuyaoDirection: slice.liuyaoDirection,
    resonance: slice.resonance,
    technicalEntry: slice.technicalEntry,
    openedAt: slice.openedAt.toISOString(),
    closedAt: slice.closedAt?.toISOString() ?? null,
    closeReason: slice.closeReason,
  });
  return {
    generatedAt: new Date().toISOString(),
    product: "MOOX AI Live Trading",
    disclosure: "Official MOOX strategy account only. Member balances and positions are never public.",
    positions: slices.active.map(mapRecord),
    pendingReconciliation: slices.pending.map(mapRecord),
    recentHistory: slices.recentHistory.map(mapRecord),
  };
}
