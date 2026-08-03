import { NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import { checkMemberApiRateLimit } from "@/lib/auth/member-api-rate-limit";
import { getTomorrowForecastAccessPayload } from "@/lib/prediction-access-server";
import { TOMORROW_PREDICTION_MESSAGES } from "@/lib/prediction-access";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  noStore();
  const payload = await getTomorrowForecastAccessPayload();

  if (!payload.allowed) {
    const status = payload.access.reason === "LOGIN_REQUIRED" ? 401 : 403;
    return NextResponse.json(
      {
        ok: false,
        reason: payload.access.reason,
        message:
          payload.access.reason === "LOGIN_REQUIRED"
            ? TOMORROW_PREDICTION_MESSAGES.LOGIN_REQUIRED
            : payload.access.reason === "DEVICE_REQUIRED"
              ? TOMORROW_PREDICTION_MESSAGES.DEVICE_REQUIRED
              : TOMORROW_PREDICTION_MESSAGES.MEMBERSHIP_REQUIRED,
      },
        { status, headers: { "Cache-Control": "private, no-store, max-age=0" } }
    );
  }

  const rate = await checkMemberApiRateLimit({ scope: "tomorrow-forecast" });
  if (!rate.ok) {
    return NextResponse.json({ ok: false, reason: "RATE_LIMITED", message: "请求过于频繁" }, { status: 429 });
  }

  return NextResponse.json(
    {
      ok: true,
      reason: payload.access.reason,
      data: payload.forecasts,
      empty: payload.forecasts.length === 0,
      message:
        payload.forecasts.length === 0 ? "下一交易日预测尚未发布" : undefined,
    },
    { headers: { "Cache-Control": "private, no-store, max-age=0" } }
  );
}
