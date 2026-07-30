import { NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import { getAccessUser } from "@/lib/auth/get-access-user";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  noStore();
  const access = await getAccessUser();
  if (!access.authenticated) {
    return NextResponse.json(
      { authenticated: false },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }
  return NextResponse.json(
    {
      authenticated: true,
      userId: access.userId,
      email: access.email,
      role: access.isAdmin ? "admin" : "user",
      isAdmin: access.isAdmin,
      membershipStatus: access.membershipStatus ?? "inactive",
      membershipPlan: access.membershipPlan ?? null,
      membershipExpiresAt: access.membershipExpiresAt
        ? access.membershipExpiresAt.toISOString()
        : null,
      isActiveMember: access.isActiveMember,
      canAccessToday: access.canAccessToday,
      canAccessTomorrow: access.canAccessTomorrow,
      canAccessWeekly: access.canAccessWeekly,
      serverNow: access.serverNowIso,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
