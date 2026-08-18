import { NextResponse } from "next/server";
import { getPublicUnifiedLiveSnapshot } from "@/lib/trading-signals/unified-live-public";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    return NextResponse.json(await getPublicUnifiedLiveSnapshot());
  } catch {
    return NextResponse.json({ generatedAt: new Date().toISOString(), product: "MOOX AI Live Trading", positions: [] });
  }
}
