// MOOX_V72082_MEMBER_INTRADAY_LEVELS_API
import "server-only";

import { NextResponse } from "next/server";
import { getMemberDevicePageAccess } from "@/lib/auth/member-device-guard";
import { checkMemberApiRateLimit } from "@/lib/auth/member-api-rate-limit";
import {
  getIntradayTechnicalLevels,
  hasIntradayTechnicalTarget,
} from "@/lib/market-data/intraday-chan-levels";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 10;

export async function GET(request: Request) {
  const gate = await getMemberDevicePageAccess();
  if (gate.status !== "ALLOWED") {
    return NextResponse.json(
      { ok: false, error: gate.status === "LOGIN_REQUIRED" ? "LOGIN_REQUIRED" : "MEMBER_ACCESS_REQUIRED" },
      { status: gate.status === "LOGIN_REQUIRED" ? 401 : 403, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  const rate = await checkMemberApiRateLimit({ scope: "intraday-levels", limit: 120, windowMs: 60_000 });
  if (!rate.ok) {
    return NextResponse.json(
      { ok: false, error: "RATE_LIMITED" },
      { status: 429, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  const url = new URL(request.url);
  const key = (url.searchParams.get("key") ?? "").trim().toUpperCase();
  const direction = (url.searchParams.get("direction") ?? "").trim().slice(0, 80);
  if (!key || key.length > 80 || !hasIntradayTechnicalTarget(key)) {
    return NextResponse.json(
      { ok: false, error: "UNSUPPORTED_INTRADAY_TARGET" },
      { status: 400, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  const levels = await getIntradayTechnicalLevels(key, direction || null);
  return NextResponse.json(
    { ok: true, levels },
    {
      headers: {
        "Cache-Control": "private, max-age=20, stale-while-revalidate=40",
        "X-MOOX-Research-Only": "true",
        "X-MOOX-Auto-Trading-Changed": "false",
      },
    },
  );
}
