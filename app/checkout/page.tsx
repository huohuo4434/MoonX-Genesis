import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Section } from "@/components/ui";
import { ManualCheckoutClient } from "@/components/payments/ManualCheckoutClient";
import { CheckoutIntro } from "@/components/payments/CheckoutIntro";
import { getCurrentUser } from "@/lib/auth/permissions";
import { getPaymentConfig } from "@/lib/payments/config";
import { getFounderDiscountQuote } from "@/lib/payments/founder-discount-server";
import { getFeatureFlags } from "@/lib/feature-flags";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const user = await getCurrentUser();
  const { plan } = await searchParams;
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/checkout?plan=${plan ?? "MONTHLY"}`)}`);
  }
  if (!getFeatureFlags().paymentsEnabled) {
    return <main><Section spacing="lg">付款功能暂未开放 / Payments are currently unavailable.</Section></main>;
  }

  const cfg = getPaymentConfig();
  const founderQuote = await getFounderDiscountQuote(user);

  return (
    <main>
      <Section spacing="lg" className="flex flex-col items-center gap-4">
        <CheckoutIntro />
        <Suspense fallback={null}>
          <ManualCheckoutClient
            email={user.email}
            trc20Address={cfg.trc20Address}
            bep20Address={cfg.bep20Address}
            founderQuote={founderQuote}
            bep20Enabled={cfg.bep20Enabled}
            trc20Contract={cfg.tronUsdtContract}
            bep20Contract={cfg.bscTokenContract}
          />
        </Suspense>
      </Section>
    </main>
  );
}
