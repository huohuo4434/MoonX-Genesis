import { NextResponse } from "next/server";

import { checkMemberApiRateLimit } from "@/lib/auth/member-api-rate-limit";
import { getMemberDevicePageAccess } from "@/lib/auth/member-device-guard";
import { normalizeCryptoBaseSymbol } from "@/lib/market-data/crypto-market-symbols";
import { loadCryptoMarketIntelligence } from "@/lib/market-data/multi-source-crypto";
import type { ChanTimeframe } from "@/types/chan-execution";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 15;

const ALLOWED_TIMEFRAMES = new Set<ChanTimeframe>(["5m", "30m", "1H", "4H", "1D"]);

export async function GET(request: Request) {
  const gate = await getMemberDevicePageAccess();
  if (gate.status !== "ALLOWED") {
    return NextResponse.json(
      { error: gate.status === "DEVICE_REQUIRED" ? "会员设备使用权无效" : "会员权限不足", reason: gate.device?.reason },
      { status: gate.status === "LOGIN_REQUIRED" ? 401 : 403 }
    );
  }
  const rate = await checkMemberApiRateLimit({ scope: "market-structure", limit: 90, windowMs: 60_000 });
  if (!rate.ok) return NextResponse.json({ error: "请求过于频繁" }, { status: 429 });
  const url = new URL(request.url);
  const symbol = normalizeCryptoBaseSymbol(url.searchParams.get("symbol") ?? "BTC");
  const rawTimeframe = url.searchParams.get("timeframe") as ChanTimeframe | null;
  const timeframe: ChanTimeframe = rawTimeframe && ALLOWED_TIMEFRAMES.has(rawTimeframe) ? rawTimeframe : "4H";
  try {
    const snapshot = await loadCryptoMarketIntelligence({ symbol, timeframe, timeoutMs: 4_500 });
    return NextResponse.json(snapshot, {
      headers: {
        "Cache-Control": "private, max-age=10, stale-while-revalidate=20",
        "X-MOOX-Market-Authority": "EXECUTION_ONLY",
        "X-MOOX-Auto-Trading-Changed": "false",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "多源行情读取失败" },
      { status: 503, headers: { "Cache-Control": "private, no-store" } }
    );
  }
}
