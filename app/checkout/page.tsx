import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Heading, Section, Text } from "@/components/ui";
import { CheckoutClient } from "@/components/payments/CheckoutClient";
import { getCurrentUser } from "@/lib/auth/permissions";
import { getPaymentConfig } from "@/lib/payments/config";

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

  return (
    <main>
      <Section spacing="lg" className="flex flex-col items-center gap-4">
        <Heading as="h1" size="h2">
          会员结账
        </Heading>
        <Text variant="body-sm" color="secondary">
          转账后提交交易哈希，管理员审核开通。
        </Text>
        <Suspense fallback={null}>
          <CheckoutClient trc20Address={cfg.trc20Address} bep20Address={cfg.bep20Address} />
        </Suspense>
      </Section>
    </main>
  );
}
