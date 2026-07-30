import { NextRequest, NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import { getCurrentUser } from "@/lib/auth/permissions";
import { getOrCreateMyInvite, listMyReferralRecords } from "@/lib/referral/service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function handleReferralMe(request: NextRequest) {
  noStore();
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "LOGIN_REQUIRED", message: "请先登录" },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  const invite = await getOrCreateMyInvite(user, {
    requestOrigin: request.nextUrl.origin,
  });

  if (!invite.ok) {
    const status = invite.error === "MEMBERSHIP_REQUIRED" ? 403 : 500;
    return NextResponse.json(
      {
        ok: false,
        error: invite.error,
        message: invite.message,
      },
      { status, headers: { "Cache-Control": "no-store" } }
    );
  }

  const records = await listMyReferralRecords(user.id);
  return NextResponse.json(
    {
      ok: true,
      referralCode: invite.referralCode,
      referralUrl: invite.referralUrl,
      successfulInvites: invite.successfulInvites,
      rewardDays: invite.rewardDays,
      inviteCode: invite.inviteCode,
      inviteLink: invite.inviteLink,
      successCount: invite.successCount,
      rewardDaysTotal: invite.rewardDaysTotal,
      pendingCount: invite.pendingCount,
      rewardDaysPerSuccess: invite.rewardDaysPerSuccess,
      records: records.map((r) => ({
        id: r.id,
        status: r.status,
        rewardDays: r.reward_days,
        inviteeEmail: r.invitee_email,
        createdAt: r.created_at,
        paymentId: r.payment_id,
      })),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function GET(request: NextRequest) {
  return handleReferralMe(request);
}
