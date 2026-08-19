import { NextResponse } from "next/server";
import { getPublicUnifiedLiveSnapshot } from "@/lib/trading-signals/unified-live-public";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PUBLIC_CACHE = { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=45" };

export async function GET() {
  try {
    return NextResponse.json(await getPublicUnifiedLiveSnapshot(), { headers: PUBLIC_CACHE });
  } catch {
    return NextResponse.json(
      { generatedAt: new Date().toISOString(), product: "MOOX AI Live Trading", positions: [] },
      { headers: PUBLIC_CACHE },
    );
  }
}
