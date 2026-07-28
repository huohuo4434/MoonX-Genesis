import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/permissions";
import { getOrCreateMyInvite, listMyReferralRecords } from "@/lib/referral/service";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const invite = await getOrCreateMyInvite(user);
  const records = await listMyReferralRecords(user.id);
  return NextResponse.json({
    ok: true,
    ...invite,
    records: records.map((r) => ({
      id: r.id,
      status: r.status,
      rewardDays: r.reward_days,
      inviteeEmail: r.invitee_email,
      createdAt: r.created_at,
      paymentId: r.payment_id,
    })),
  });
}
