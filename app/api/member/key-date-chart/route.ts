import { NextResponse } from "next/server";
import { getMemberDevicePageAccess as requireMemberDeviceAccess } from "@/lib/auth/member-device-guard";
import { checkMemberApiRateLimit } from "@/lib/auth/member-api-rate-limit";
import { loadChanCandles } from "@/lib/market-data/chan-market-data";
import { chartZones, closedChartBars } from "@/lib/presentation/key-date-chart";
import type { ChanInstrument } from "@/types/chan-execution";

export const dynamic = "force-dynamic";
export const maxDuration = 15;
const symbols: Record<string, string> = {
  btc: "BTCUSDT", eth: "ETHUSDT", sol: "SOLUSDT", hype: "HYPEUSDT",
  sandisk: "SNDK", mu: "MU", nvda: "NVDA", aapl: "AAPL", amzn: "AMZN", meta: "META",
  googl: "GOOGL", msft: "MSFT", tsla: "TSLA", lite: "LITE", nbis: "NBIS", intel: "INTC",
  tencent: "0700.HK", gold: "GC=F", silver: "SI=F",
};
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
  const crypto = quoteSymbol.endsWith("USDT");
  const timeZone = crypto ? "UTC" : assetId === "tencent" ? "Asia/Hong_Kong" : "America/New_York";
  const instrument: ChanInstrument = {
    symbol: quoteSymbol, label: quoteSymbol, providerSymbol: quoteSymbol, formalPlanSymbol: quoteSymbol,
    provider: crypto ? "BITGET_PUBLIC" : "YAHOO_CHART",
    market: crypto ? "CRYPTO" : quoteSymbol.endsWith("=F") ? "INDEX_COMMODITY" : "US_EQUITY",
  };
  try {
    const now = Date.now();
    const result = await loadChanCandles({ symbol: quoteSymbol, instrument, timeframe: "1D", capturedNowMs: now, timeoutMs: 4_000 });
    const bars = closedChartBars(result.candles, timeZone, now);
    if (!bars.length) return NextResponse.json({ error: "MARKET_DATA_UNAVAILABLE" }, { status: 503, headers });
    return NextResponse.json({ assetId, quoteSymbol, timeZone, bars, ...chartZones(bars),
      source: crypto ? "Public crypto feeds / USDT" : quoteSymbol.endsWith("=F") ? "Yahoo Finance / continuous futures" : "Yahoo Finance",
      asOf: bars.at(-1)!.date, stale: now - bars.at(-1)!.timestamp > (crypto ? 3 : 6) * 86_400_000,
    }, { headers });
  } catch {
    return NextResponse.json({ error: "MARKET_DATA_UNAVAILABLE" }, { status: 503, headers });
  }
}
