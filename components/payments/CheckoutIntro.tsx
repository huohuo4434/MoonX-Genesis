"use client";

import { Heading, Text } from "@/components/ui";
import { useLocale } from "@/lib/i18n/LocaleProvider";

export function CheckoutIntro() {
  const { locale } = useLocale();
  const en = locale === "en";
  return (
    <>
      <Heading as="h1" size="h2">{en ? "Membership payment · Manual review" : "会员付款 · 人工核验"}</Heading>
      <Text variant="body-sm" color="secondary">
        {en
          ? "After payment, contact our official Telegram support. Membership is activated by an administrator after receipt is verified."
          : "付款后请联系官方电报客服，由管理员核实到账后开通会员。"}
      </Text>
    </>
  );
}
