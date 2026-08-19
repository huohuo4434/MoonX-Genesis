import { NextResponse } from "next/server";
import {
  buildActionableIntradayLevels,
  isCoreActionableSymbol,
  type ActionableLevelSnapshot,
  type CoreActionableSymbol,
} from "@/lib/market-data/actionable-intraday-levels";

// MOOX_ACTIONABLE_LEVELS_API_V72092
export const dynamic = "force-dynamic";

const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map<
  CoreActionableSymbol,
  { expiresAt: number; value: ActionableLevelSnapshot }
>();

function compact(snapshot: ActionableLevelSnapshot) {
  return {
    symbol: snapshot.symbol,
    quoteSymbol: snapshot.quoteSymbol,
    referencePrice: snapshot.referencePrice,
    atr1h: snapshot.atr1h,
    support: snapshot.support,
    resistance: snapshot.resistance,
    secondSupport: snapshot.secondSupport,
    secondResistance: snapshot.secondResistance,
    minCorridor: snapshot.minCorridor,
    dataSource: snapshot.dataSource,
    asOf: snapshot.asOf,
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const raw = (url.searchParams.get("symbol") ?? "").trim().toUpperCase();

  if (!isCoreActionableSymbol(raw)) {
    return NextResponse.json(
      { ok: false, error: "UNSUPPORTED_SYMBOL" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const symbol: CoreActionableSymbol = raw;
  const now = Date.now();
  const cached = cache.get(symbol);
  if (cached && cached.expiresAt > now) {
    return NextResponse.json(
      { ok: true, cached: true, snapshot: compact(cached.value) },
      { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=240" } },
    );
  }

  try {
    const snapshot = await buildActionableIntradayLevels(symbol);
    cache.set(symbol, { expiresAt: now + CACHE_TTL_MS, value: snapshot });
    return NextResponse.json(
      { ok: true, cached: false, snapshot: compact(snapshot) },
      { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=240" } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "ACTIONABLE_LEVELS_UNAVAILABLE",
        detail: error instanceof Error ? error.message : "unknown error",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
