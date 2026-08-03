import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Section } from "@/components/ui";
import { CheckoutClient } from "@/components/payments/CheckoutClient";
import { CheckoutIntro } from "@/components/payments/CheckoutIntro";
import { getCurrentUser } from "@/lib/auth/permissions";
import { getPaymentConfig } from "@/lib/payments/config";
import { getFounderDiscountQuote } from "@/lib/payments/founder-discount-server";

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

  const cfg = getPaymentConfig();
  const founderQuote = await getFounderDiscountQuote(user);

  return (
    <main>
      <Section spacing="lg" className="flex flex-col items-center gap-4">
        <CheckoutIntro />
        <Suspense fallback={null}>
          <CheckoutClient
            trc20Address={cfg.trc20Address}
            bep20Address={cfg.bep20Address}
            founderQuote={founderQuote}
          />
        </Suspense>
      </Section>
    </main>
  );
}
