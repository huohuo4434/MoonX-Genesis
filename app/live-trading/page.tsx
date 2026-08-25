import PublicLiveTradingBoard from "@/components/live-trading/PublicLiveTradingBoard";
import { getPublicUnifiedLiveSnapshot } from "@/lib/trading-signals/unified-live-public";

export const dynamic = "force-dynamic";

export default async function LiveTradingPage() {
  const snapshot = await getPublicUnifiedLiveSnapshot().catch(() => ({ positions: [], pendingReconciliation: [], recentHistory: [] }));
  return <PublicLiveTradingBoard positions={snapshot.positions} pendingReconciliation={snapshot.pendingReconciliation} recentHistory={snapshot.recentHistory} />;
}
