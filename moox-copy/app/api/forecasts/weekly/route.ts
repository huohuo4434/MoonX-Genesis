import { NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
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
            : WEEKLY_PREDICTION_MESSAGES.MEMBERSHIP_REQUIRED,
      },
      { status, headers: { "Cache-Control": "private, no-store, max-age=0" } }
    );
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
