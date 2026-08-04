import type { Metadata } from "next";
import { buildLocalizedPageMetadata, getRequestLocale } from "@/lib/i18n/server";
import { unstable_noStore as noStore } from "next/cache";
import { PricingPageContent } from "@/components/payments/PricingPageContent";
import { getCurrentUser, isAdmin, isActiveMember } from "@/lib/auth/permissions";
import { getPaymentConfig } from "@/lib/payments/config";
import { OFFICIAL_PLAN_PRICES } from "@/lib/payments/plan-display";
import { getFounderDiscountQuote } from "@/lib/payments/founder-discount-server";
import type { MembershipPlan } from "@/types/membership";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return buildLocalizedPageMetadata({
    locale,
    basePath: "/pricing",
    titleZh: "MOOX会员价格",
    titleEn: "MOOX Membership Pricing",
    descriptionZh: "MOOX会员方案、创始会员连续续订优惠与USDT自动付款说明。",
    descriptionEn: "Compare free and member access, founding-member discounts and automatic USDT payment instructions.",
  });
}


export const dynamic = "force-dynamic";
export const revalidate = 0;


function buildPlans(): MembershipPlan[] {
  return [
    { id: "1", code: "MONTHLY", name: "月度会员", duration_days: 30, price_usdt: OFFICIAL_PLAN_PRICES.MONTHLY, access_level: "member", active: true, sort_order: 1 },
    { id: "2", code: "QUARTERLY", name: "季度会员", duration_days: 90, price_usdt: OFFICIAL_PLAN_PRICES.QUARTERLY, access_level: "member", active: true, sort_order: 2 },
    { id: "3", code: "YEARLY", name: "年度会员", duration_days: 365, price_usdt: OFFICIAL_PLAN_PRICES.YEARLY, access_level: "member", active: true, sort_order: 3 },
  ];
}

export default async function PricingPage() {
  noStore();
  const cfg = getPaymentConfig();
  const user = await getCurrentUser();
  const founderQuote = await getFounderDiscountQuote(user);
  const inviteHref = user ? "/account/invite" : `/login?next=${encodeURIComponent("/account/invite")}`;

  return (
    <PricingPageContent
      plans={buildPlans()}
      supportEmail={cfg.supportEmail}
      trc20Address={cfg.trc20Address}
      bep20Address={cfg.bep20Address}
      isLoggedIn={Boolean(user)}
      isAdmin={isAdmin(user)}
      isActiveMember={isActiveMember(user)}
      inviteHref={inviteHref}
      founderQuote={founderQuote}
    />
  );
}
