import { unstable_noStore as noStore } from "next/cache";
import { redirect } from "next/navigation";
import { AccountPageClient } from "@/components/account/AccountPageClient";
import { getAccessUser } from "@/lib/auth/get-access-user";
import { getCurrentUser } from "@/lib/auth/permissions";
import { latestMembershipEventForUser } from "@/lib/auth/membership-events";
import { getPaymentConfig } from "@/lib/payments/config";
import { getFounderDiscountQuote } from "@/lib/payments/founder-discount-server";
import { getReferralStats } from "@/lib/referral/store";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AccountPage() {
  noStore();
  const access = await getAccessUser();
  const userId = access.userId;
  if (!access.authenticated || !userId) redirect("/login");

  const cfg = getPaymentConfig();
  const [latestEvent, referralStats, authUser] = await Promise.all([
    latestMembershipEventForUser(userId),
    getReferralStats(userId).catch(() => ({ successCount: 0, rewardDaysTotal: 0, pendingCount: 0 })),
    getCurrentUser(),
  ]);
  const founderQuote = await getFounderDiscountQuote(authUser);
  const remainingDays = access.isAdmin
    ? null
    : access.membershipExpiresAt
      ? Math.max(0, Math.ceil((access.membershipExpiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
      : null;

  return (
    <AccountPageClient
      email={access.email ?? ""}
      userId={userId}
      isAdmin={access.isAdmin}
      isActiveMember={access.isActiveMember}
      membershipPlan={access.membershipPlan}
      membershipExpiresAt={access.membershipExpiresAt?.toISOString() ?? null}
      remainingDays={remainingDays}
      latestEvent={latestEvent ? {
        eventType: latestEvent.eventType,
        createdAt: latestEvent.createdAt,
        previousExpiresAt: latestEvent.previousExpiresAt,
        newExpiresAt: latestEvent.newExpiresAt,
      } : null}
      referralRewardDays={referralStats.rewardDaysTotal ?? 0}
      serverNowIso={access.serverNowIso}
      canAccessToday={access.canAccessToday}
      canAccessTomorrow={access.canAccessTomorrow}
      canAccessWeekly={access.canAccessWeekly}
      supportEmail={cfg.supportEmail}
      founderQuote={founderQuote}
    />
  );
}
