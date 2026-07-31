import { NextResponse } from "next/server";
import { getTradeSignalDashboardSnapshot } from "@/lib/trading-signals/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const snapshot = await getTradeSignalDashboardSnapshot();
  return NextResponse.json(
    {
      schema: "moonx.trade.signal.health.v1",
      databaseReady: snapshot.databaseReady,
      databaseMode: snapshot.databaseMode,
      message: snapshot.databaseMessage,
      endpoint: "/api/v1/signals",
      setupPage: "/admin/trading-signals/setup",
    },
    { status: snapshot.databaseReady ? 200 : 503 }
  );
}
