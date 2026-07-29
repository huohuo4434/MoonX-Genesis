import { NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import { getTodayForecastAccessPayload } from "@/lib/prediction-access-server";
import { TODAY_PREDICTION_MESSAGES } from "@/lib/prediction-access";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  noStore();
  const payload = await getTodayForecastAccessPayload();

  if (!payload.allowed) {
    if (payload.access.reason === "LOGIN_REQUIRED") {
      return NextResponse.json(
        {
          ok: false,
          reason: "LOGIN_REQUIRED",
          message: TODAY_PREDICTION_MESSAGES.LOGIN_REQUIRED,
          teaser: payload.teaser,
          data: [],
        },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
    }
    return NextResponse.json(
      {
        ok: false,
        reason: "WAIT_UNTIL_08",
        message: TODAY_PREDICTION_MESSAGES.WAIT_UNTIL_08,
        releaseTime: "08:00",
        timezone: "Asia/Shanghai",
        teaser: payload.teaser,
        data: [],
      },
      { status: 403, headers: { "Cache-Control": "no-store" } }
    );
  }

  return NextResponse.json(
    {
      ok: true,
      reason: payload.access.reason,
      data: payload.forecasts,
      verifying: payload.verifying,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
