import "server-only";

import { NextResponse } from "next/server";
import { getMemberDevicePageAccess } from "@/lib/auth/member-device-guard";
import { checkMemberApiRateLimit } from "@/lib/auth/member-api-rate-limit";
import { hasIntradayTechnicalTarget } from "@/lib/market-data/intraday-chan-levels";
import { loadMemberStockPathSnapshot } from "@/lib/market-data/member-stock-path.server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 10;

const requireMemberStockPathAccess = getMemberDevicePageAccess;

export async function GET(request: Request) {
  const gate = await requireMemberStockPathAccess();
  if (gate.status !== "ALLOWED") {
    return NextResponse.json(
      { ok: false, error: gate.status === "LOGIN_REQUIRED" ? "LOGIN_REQUIRED" : "MEMBER_ACCESS_REQUIRED" },
      { status: gate.status === "LOGIN_REQUIRED" ? 401 : 403, headers: { "Cache-Control": "private, no-store" } },
    );
  }
  const rate = await checkMemberApiRateLimit({ scope: "member-stock-path", limit: 60, windowMs: 60_000 });
  if (!rate.ok) return NextResponse.json({ ok: false, error: "RATE_LIMITED" }, { status: 429 });

  const key = new URL(request.url).searchParams.get("key")?.trim().toUpperCase() ?? "";
  if (!key.startsWith("FOCUS:") || key.length > 80 || !hasIntradayTechnicalTarget(key)) {
    return NextResponse.json(
      { ok: false, error: "UNSUPPORTED_STOCK_PATH_TARGET" },
      { status: 400, headers: { "Cache-Control": "private, no-store" } },
    );
  }
  const snapshot = await loadMemberStockPathSnapshot(key);
  return NextResponse.json(
    { ok: true, snapshot },
    {
      headers: {
        "Cache-Control": "private, max-age=30, stale-while-revalidate=60",
        "X-MOOX-Research-Only": "true",
        "X-MOOX-Auto-Trading-Changed": "false",
      },
    },
  );
}
