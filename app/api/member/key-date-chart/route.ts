import { NextResponse } from "next/server";
import { getMemberDevicePageAccess as requireMemberDeviceAccess } from "@/lib/auth/member-device-guard";
import { checkMemberApiRateLimit } from "@/lib/auth/member-api-rate-limit";
import { KEY_DATE_SYMBOLS as symbols } from "@/lib/market-data/key-date-daily.server";
import { getDailyProjection } from "@/lib/research/daily-candle-projection.server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;
const headers = { "Cache-Control": "private, no-store", "X-MOOX-Market-Authority": "RESEARCH_ONLY" };
export async function GET(request: Request) {
  const gate = await requireMemberDeviceAccess();
  if (gate.status !== "ALLOWED") return NextResponse.json({ error: "MEMBER_ACCESS_REQUIRED" }, {
    status: gate.status === "LOGIN_REQUIRED" ? 401 : 403, headers,
  });
  const rate = await checkMemberApiRateLimit({ scope: "key-date-chart", limit: 30, windowMs: 60_000 });
  if (!rate.ok) return NextResponse.json({ error: "RATE_LIMIT" }, { status: 429, headers });
  const assetId = new URL(request.url).searchParams.get("asset") ?? "btc";
  const quoteSymbol = Object.hasOwn(symbols, assetId) ? symbols[assetId] : undefined;
  if (!quoteSymbol) return NextResponse.json({ error: "UNSUPPORTED_MARKET" }, { status: 422, headers });
  try {
    return NextResponse.json(await getDailyProjection(assetId), { headers });
  } catch {
    return NextResponse.json({ error: "MARKET_DATA_UNAVAILABLE" }, { status: 503, headers });
  }
}
