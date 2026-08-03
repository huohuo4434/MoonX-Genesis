import { NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import { checkMemberApiRateLimit } from "@/lib/auth/member-api-rate-limit";
import { getWeeklyForecastAccessDecision } from "@/lib/prediction-access-server";
import { WEEKLY_PREDICTION_MESSAGES } from "@/lib/prediction-access";
import {
  listPublishedWeeklyAnalyses,
  toWeeklyMemberView,
} from "@/lib/data/weekly-analysis";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  noStore();
  const decision = await getWeeklyForecastAccessDecision();

  if (!decision.allowed) {
    const status = decision.access.reason === "LOGIN_REQUIRED" ? 401 : 403;
    return NextResponse.json(
      {
        ok: false,
        reason: decision.access.reason,
        message:
          decision.access.reason === "LOGIN_REQUIRED"
            ? WEEKLY_PREDICTION_MESSAGES.LOGIN_REQUIRED
            : decision.access.reason === "DEVICE_REQUIRED"
              ? WEEKLY_PREDICTION_MESSAGES.DEVICE_REQUIRED
              : WEEKLY_PREDICTION_MESSAGES.MEMBERSHIP_REQUIRED,
      },
      { status, headers: { "Cache-Control": "private, no-store, max-age=0" } }
    );
  }

  const rate = await checkMemberApiRateLimit({ scope: "weekly-forecast" });
  if (!rate.ok) {
    return NextResponse.json({ ok: false, reason: "RATE_LIMITED", message: "请求过于频繁" }, { status: 429 });
  }

  return NextResponse.json(
    {
      ok: true,
      reason: decision.access.reason,
      data: listPublishedWeeklyAnalyses().map(toWeeklyMemberView),
    },
    { headers: { "Cache-Control": "private, no-store, max-age=0" } }
  );
}
