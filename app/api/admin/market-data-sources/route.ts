import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/permissions";
import { normalizeCryptoBaseSymbol } from "@/lib/market-data/crypto-market-symbols";
import { loadCoreCryptoSourceHealth } from "@/lib/market-data/multi-source-crypto";
import type { ChanTimeframe } from "@/types/chan-execution";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 20;

const ALLOWED_TIMEFRAMES = new Set<ChanTimeframe>(["5m", "30m", "1H", "4H", "1D"]);

export async function GET(request: Request) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const url = new URL(request.url);
  const rawSymbols = (url.searchParams.get("symbols") ?? "BTC,ETH,SOL,HYPE")
    .split(",")
    .map(normalizeCryptoBaseSymbol)
    .filter(Boolean)
    .slice(0, 12);
  const rawTimeframe = url.searchParams.get("timeframe") as ChanTimeframe | null;
  const timeframe: ChanTimeframe = rawTimeframe && ALLOWED_TIMEFRAMES.has(rawTimeframe) ? rawTimeframe : "5m";
  const report = await loadCoreCryptoSourceHealth({ symbols: rawSymbols, timeframe, timeoutMs: 4_000 });
  return NextResponse.json(report, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="moox-market-data-health-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
