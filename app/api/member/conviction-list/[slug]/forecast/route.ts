import { NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import { getMemberDevicePageAccess } from "@/lib/auth/member-device-guard";
import { checkMemberApiRateLimit } from "@/lib/auth/member-api-rate-limit";
import { getConvictionDetailPayload } from "@/lib/data/conviction/access";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Member forecast for a conviction asset — server auth required. */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> }
) {
  noStore();
  const gate = await getMemberDevicePageAccess();
  if (gate.status !== "ALLOWED") {
    return NextResponse.json(
      { error: gate.status === "DEVICE_REQUIRED" ? "Device access required" : "Membership required", reason: gate.device?.reason },
      { status: gate.status === "LOGIN_REQUIRED" ? 401 : 403 }
    );
  }

  const rate = await checkMemberApiRateLimit({ scope: "conviction-forecast" });
  if (!rate.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const { slug } = await ctx.params;
  const payload = await getConvictionDetailPayload(slug);
  if (!payload || payload.mode !== "fullAccess" || !payload.forecast) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(
    {
      slug,
      forecast: payload.forecast,
      isAdmin: payload.isAdmin,
    },
    { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" } }
  );
}
